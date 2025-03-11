package main

import (
	"InterviewCalender/TimeSlot/backend/handler"
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
		c.Set("db", db)
		c.Next()
	}
}

func GetAvailableSlots(c *gin.Context) {
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
		AvailableDate time.Time `json:"available_date"`
	}

	query := `SELECT id, available_date FROM availability WHERE available_date = ?`
	if err := db.Raw(query, dateParam).Scan(&slots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching available slots"})
		return
	}

	result := make([]map[string]interface{}, len(slots))
	for i, slot := range slots {
		result[i] = gin.H{
			"id":             slot.ID,
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
		AvailableDate time.Time `json:"available_date"`
	}

	query := `SELECT id, available_date FROM availability WHERE available_date = ?`
	if err := db.Raw(query, dateParam).Scan(&slots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching slots"})
		return
	}

	result := make([]map[string]interface{}, len(slots))
	for i, slot := range slots {
		result[i] = gin.H{
			"id":             slot.ID,
			"available_date": slot.AvailableDate.Format("2006-01-02"),
		}
	}

	c.JSON(http.StatusOK, result)
}

func BookTimeSlot(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required"`
		TimeSlot string `json:"time_slot" binding:"required"`
		SlotDate string `json:"slot_date" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide all required fields: name, time_slot, and slot_date."})
		return
	}

	// Validate time format (12-hour format)
	if _, err := time.Parse("03:04 PM", req.TimeSlot); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time format. Use hh:mm AM/PM."})
		return
	}

	// Validate date format
	if _, err := time.Parse("2006-01-02", req.SlotDate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD."})
		return
	}

	// Transaction for safety
	tx := db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Check if slot is already booked
	var existingBooking int64
	checkQuery := `SELECT COUNT(*) FROM bookings WHERE time_slot = ? AND slot_date = ?`

	if err := tx.Raw(checkQuery, req.TimeSlot, req.SlotDate).Scan(&existingBooking).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking existing bookings"})
		return
	}

	if existingBooking > 0 {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "This slot is already booked."})
		return
	}

	// Insert the booking
	insertQuery := `INSERT INTO bookings (name, time_slot, slot_date) VALUES (?, ?, ?)`
	if err := tx.Exec(insertQuery, req.Name, req.TimeSlot, req.SlotDate).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating booking"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error committing transaction"})
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
	r.Use(cors.Default(), dbMiddleware())

	api := r.Group("/api")
	{
		api.POST("/availability", handler.SetInterviewerAvailability)
		api.GET("/availability", GetAvailabilityByDate)
		api.GET("/availability/slots", GetAvailableSlots)
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
