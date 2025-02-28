package handler

import (
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Availability model
type Availability struct {
	gorm.Model
	InterviewerID uint      `json:"interviewer_id" binding:"required" gorm:"index"`
	StartTime     time.Time `json:"start_time" binding:"required" gorm:"type:timestamp"`
	EndTime       time.Time `json:"end_time" binding:"required" gorm:"type:timestamp"`
	TimeZone      string    `json:"time_zone,omitempty"`
	WorkingDays   []int     `json:"working_days" gorm:"type:integer[]" binding:"required"`
	BufferMinutes int       `json:"buffer_minutes,omitempty"`
	Booked        bool      `json:"booked" gorm:"default:false"`
	BookedBy      string    `json:"booked_by,omitempty"`
}

// Updated Booking model with only required fields
type Booking struct {
	gorm.Model
	SlotID uint   `json:"slot_id" binding:"required"`
	Name   string `json:"name" binding:"required"`
	Email  string `json:"email" binding:"required"`
	Date   string `json:"date" binding:"required"`
}

// Booking request struct
type BookingRequest struct {
	SlotID     uint   `json:"slot_id" binding:"required"`
	BookerName string `json:"booker_name" binding:"required"`
	UserID     uint   `json:"user_id" binding:"required"`
	Name       string `json:"name" binding:"required"`
	Email      string `json:"email" binding:"required"`
	Date       string `json:"date" binding:"required"`
}

// Middleware to attach DB instance
func AttachDB(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("db", db)
		c.Next()
	}
}

// Initialize database connection
func InitDB() (*gorm.DB, error) {
	dsn := "user=youruser password=yourpassword dbname=yourdbname port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	return db, nil
}

// Generate a random user ID
func generateUserID() string {
	rand.Seed(time.Now().UnixNano())
	return "user-" + fmt.Sprintf("%d", rand.Intn(1000000))
}

// Generate a random interview ID
func generateInterviewID() string {
	rand.Seed(time.Now().UnixNano())
	return "interview-" + fmt.Sprintf("%d", rand.Intn(1000000))
}

// Set Interviewer Availability
func SetInterviewerAvailability(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	var availability Availability

	if err := c.ShouldBindJSON(&availability); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(availability.WorkingDays) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Working days must be specified"})
		return
	}

	for _, day := range availability.WorkingDays {
		if day < 0 || day > 6 {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid working day: %d", day)})
			return
		}
	}

	if availability.StartTime.After(availability.EndTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Start time must be before end time"})
		return
	}

	if err := db.Create(&availability).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save availability"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Availability set successfully", "data": availability})
}

// Get Available Time Slots
func GetAvailableTimeSlots(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	date := c.Query("date")

	if date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Date is required"})
		return
	}

	startDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	start := startDate.UTC()
	end := start.Add(24 * time.Hour)

	var slots []Availability
	if err := db.Where("start_time >= ? AND end_time <= ? AND booked = ?", start, end, false).Find(&slots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching slots"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"available_slots": slots})
}

// Get Interviewer Availability
func GetInterviewerAvailability(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	interviewerID, err := strconv.Atoi(c.Param("interviewer_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid interviewer ID"})
		return
	}

	date := c.Query("date")
	if date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Date is required"})
		return
	}

	startDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	start := startDate.UTC()
	end := start.Add(24 * time.Hour)
	var slots []Availability

	if err := db.Where("interviewer_id = ? AND start_time >= ? AND end_time <= ?", interviewerID, start, end).Find(&slots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching interviewer availability"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"availability": slots})
}

// Book a Time Slot
func BookTimeSlot(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	var req BookingRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var slot Availability
	if err := db.First(&slot, req.SlotID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Slot not found"})
		return
	}

	if slot.Booked {
		c.JSON(http.StatusConflict, gin.H{"error": "Slot already booked"})
		return
	}

	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Unexpected error during booking"})
		}
	}()

	slot.Booked = true
	slot.BookedBy = req.BookerName
	if err := tx.Save(&slot).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Booking failed"})
		return
	}

	booking := Booking{
		SlotID: slot.ID,
		Name:   req.Name,
		Email:  req.Email,
		Date:   req.Date,
	}

	if err := tx.Create(&booking).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save booking"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Booking successful", "booking": booking})
}

// Cancel a Booking
func CancelBooking(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	bookingID := c.Param("id")

	var booking Booking
	if err := db.First(&booking, bookingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Unexpected error during cancellation"})
		}
	}()

	var slot Availability
	if err := db.First(&slot, booking.SlotID).Error; err == nil {
		slot.Booked = false
		slot.BookedBy = ""
		if err := tx.Save(&slot).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update slot"})
			return
		}
	}

	if err := tx.Delete(&booking).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel booking"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Booking cancelled successfully"})
}
