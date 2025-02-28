package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var db *gorm.DB // Global database variable

// TimeSlot and Event structures
type TimeSlot struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	StartTime     time.Time `json:"start_time"`
	EndTime       time.Time `json:"end_time"`
	IsBooked      bool      `json:"is_booked" gorm:"default:false"`
	InterviewerID uint      `json:"interviewer_id"`
}

type Event struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	StartTime     time.Time `json:"start_time"`
	EndTime       time.Time `json:"end_time"`
	InterviewerID uint      `json:"interviewer_id"`
	CandidateID   uint      `json:"candidate_id"`
}

// Initialize MySQL database connection
func InitDB() {
	dsn := "your_user:your_password@tcp(localhost:3306)/your_dbname?charset=utf8mb4&parseTime=True&loc=Local"
	var err error
	db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}
}

// Middleware to enable CORS
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// Create a time slot
func CreateTimeSlot(c *gin.Context) {
	var timeSlot TimeSlot
	if err := c.ShouldBindJSON(&timeSlot); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.Create(&timeSlot).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Time slot created successfully!", "time_slot": timeSlot})
}

// Get available time slots by date
func GetAvailableTimeSlots(c *gin.Context) {
	date := c.DefaultQuery("date", "") // Get date parameter from URL, default to empty string if not provided
	if date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Date parameter is required"})
		return
	}

	var timeSlots []TimeSlot
	if err := db.Where("DATE(start_time) = ? AND is_booked = ?", date, false).Find(&timeSlots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, timeSlots)
}

// Book a time slot
func BookTimeSlot(c *gin.Context) {
	var request struct {
		TimeSlotID  uint `json:"time_slot_id"`
		CandidateID uint `json:"candidate_id"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var timeSlot TimeSlot
	if err := db.First(&timeSlot, request.TimeSlotID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Time slot not found!"})
		return
	}

	if timeSlot.IsBooked {
		c.JSON(http.StatusConflict, gin.H{"error": "Time slot already booked!"})
		return
	}

	timeSlot.IsBooked = true
	if err := db.Save(&timeSlot).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	event := Event{
		Title:         "Interview Booking",
		Description:   "Interview scheduled for Candidate",
		StartTime:     timeSlot.StartTime,
		EndTime:       timeSlot.EndTime,
		InterviewerID: timeSlot.InterviewerID,
		CandidateID:   request.CandidateID,
	}

	if err := db.Create(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event!"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Time slot booked successfully!", "event": event})
}

// Get all events
func GetEvents(c *gin.Context) {
	var events []Event
	if err := db.Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, events)
}

// Delete an event
func DeleteEvent(c *gin.Context) {
	id := c.Param("id")
	if err := db.Delete(&Event{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Event deleted successfully!"})
}

// Main function to run the application
func main() {
	// Initialize database connection
	InitDB()

	// Initialize Gin router
	router := gin.Default()
	router.Use(CORSMiddleware()) // Enable CORS

	// Set up API routes
	router.POST("/api/time_slots", CreateTimeSlot)
	router.GET("/api/availability", GetAvailableTimeSlots) // Fixed the endpoint to be /api/availability
	router.POST("/api/book_time_slot", BookTimeSlot)
	router.GET("/api/events", GetEvents)
	router.DELETE("/api/events/:id", DeleteEvent)

	// Start the server
	router.Run(":8080")
}
