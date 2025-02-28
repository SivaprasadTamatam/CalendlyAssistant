package main

import (
	"BookingTimeSlot/backend/handler"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var db *gorm.DB

func connectDatabase() {
	if err := godotenv.Load(); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	dsn := "host=" + os.Getenv("DB_HOST") +
		" user=" + os.Getenv("DB_USER") +
		" password=" + os.Getenv("DB_PASSWORD") +
		" dbname=" + os.Getenv("DB_NAME") +
		" port=" + os.Getenv("DB_PORT") +
		" sslmode=disable"

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get database instance: %v", err)
	}

	if err = sqlDB.Ping(); err != nil {
		log.Fatalf("Database unreachable: %v", err)
	}

	log.Println("Connected to the database successfully.")
}

func dbMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Set the db instance in the context
		c.Set("db", db)
		c.Next()
	}
}

func GetAvailableSlots(c *gin.Context) {
	interviewerID := c.Param("interviewer_id")
	dateParam := c.Param("date")

	if interviewerID == "" || dateParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Interviewer ID and date are required"})
		return
	}

	if _, err := time.Parse("2006-01-02", dateParam); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD."})
		return
	}

	var slots []struct {
		ID            int       `json:"id"`
		InterviewerID int       `json:"interviewer_id"`
		AvailableDate time.Time `json:"available_date"`
	}

	query := `SELECT id, interviewer_id, available_date FROM availability WHERE interviewer_id = ? AND available_date = ?`
	if err := db.Raw(query, interviewerID, dateParam).Scan(&slots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching available slots"})
		return
	}

	result := make([]map[string]interface{}, len(slots))
	for i, slot := range slots {
		result[i] = gin.H{
			"id":             slot.ID,
			"interviewer_id": slot.InterviewerID,
			"available_date": slot.AvailableDate.Format("2006-01-02"),
		}
	}

	c.JSON(http.StatusOK, result)
}

func GetAvailabilityByDate(c *gin.Context) {
	dateParam := c.Query("date")
	if dateParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Date is required"})
		return
	}

	if _, err := time.Parse("2006-01-02", dateParam); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD."})
		return
	}

	var slots []struct {
		ID            int       `json:"id"`
		InterviewerID int       `json:"interviewer_id"`
		AvailableDate time.Time `json:"available_date"`
	}

	query := `SELECT id, interviewer_id, available_date FROM availability WHERE available_date = ?`
	if err := db.Raw(query, dateParam).Scan(&slots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching slots"})
		return
	}

	result := make([]map[string]interface{}, len(slots))
	for i, slot := range slots {
		result[i] = gin.H{
			"id":             slot.ID,
			"interviewer_id": slot.InterviewerID,
			"available_date": slot.AvailableDate.Format("2006-01-02"),
		}
	}

	c.JSON(http.StatusOK, result)
}

func BookTimeSlot(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		UserID      int    `json:"user_id" binding:"required"`
		Interviewer int    `json:"interviewer_id" binding:"required"`
		TimeSlot    string `json:"time_slot" binding:"required"`
		SlotDate    string `json:"slot_date" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid booking data"})
		return
	}

	// Validate time in 12-hour format (hh:mm AM/PM)
	if _, err := time.Parse("03:04 PM", req.TimeSlot); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time format. Use hh:mm AM/PM."})
		return
	}

	// Validate date in YYYY-MM-DD format
	if _, err := time.Parse("2006-01-02", req.SlotDate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD."})
		return
	}

	var existingBooking int
	query := `SELECT COUNT(*) FROM bookings WHERE interviewer_id = ? AND time_slot = ? AND slot_date = ?`
	if err := db.Raw(query, req.Interviewer, req.TimeSlot, req.SlotDate).Scan(&existingBooking).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error during slot check"})
		return
	}

	if existingBooking > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "This slot is already booked."})
		return
	}

	insertQuery := `INSERT INTO bookings (name, user_id, interviewer_id, time_slot, booking_date, slot_date) VALUES (?, ?, ?, ?, ?, ?)`
	if err := db.Exec(insertQuery, req.Name, req.UserID, req.Interviewer, req.TimeSlot, time.Now().Format("2006-01-02"), req.SlotDate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error while booking slot"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Slot successfully booked"})
}

func serveReactApp(w http.ResponseWriter, r *http.Request) {
	path := filepath.Join("client/build", r.URL.Path)
	if _, err := os.Stat(path); os.IsNotExist(err) {
		path = filepath.Join("client/build", "index.html")
	}
	http.ServeFile(w, r, path)
}

func getPort() string {
	if port := os.Getenv("PORT"); port != "" {
		return ":" + port
	}
	return ":8080"
}

func main() {
	connectDatabase()
	sqlDB, _ := db.DB()
	defer sqlDB.Close()

	r := gin.Default()
	r.SetTrustedProxies(nil)
	r.Use(cors.Default(), dbMiddleware()) // Attach the db middleware here

	api := r.Group("/api")
	{
		api.POST("/interviewer/availability", handler.SetInterviewerAvailability)
		api.GET("/availability/:interviewer_id", handler.GetInterviewerAvailability)
		api.GET("/availability/:interviewer_id/:date", GetAvailableSlots)
		api.GET("/availability", GetAvailabilityByDate)
		api.POST("/book-slot", BookTimeSlot)
		api.DELETE("/bookings/:id", handler.CancelBooking)
	}

	r.NoRoute(func(c *gin.Context) {
		serveReactApp(c.Writer, c.Request)
	})

	port := getPort()
	log.Printf("Server running on %s", port)
	log.Fatal(r.Run(port))
}
