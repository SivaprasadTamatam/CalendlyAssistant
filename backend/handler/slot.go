package handler

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

var sqlDB *sql.DB // Database instance

// Slot represents a time slot structure
type Slot struct {
	SlotID        uint           `json:"slot_id"`
	StartTime     time.Time      `json:"start_time"`
	EndTime       time.Time      `json:"end_time"`
	AvailableDate time.Time      `json:"available_date"`
	UserID        sql.NullString `json:"user_id,omitempty"`
	Booked        bool           `json:"booked"`
	BookedTime    sql.NullTime   `json:"booked_time,omitempty"`
}

// GetAvailableSlots retrieves available slots for a given interviewer and date
func GetAvailableSlots(c *gin.Context) {
	interviewerID := c.Param("interviewer_id")
	date := c.Param("date")

	if sqlDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not connected"})
		return
	}

	parsedDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD."})
		return
	}

	startDate := time.Date(parsedDate.Year(), parsedDate.Month(), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, -1)

	query := `SELECT slot_id, start_time, end_time, available_date, user_id, booked, booked_time FROM slots WHERE available_date BETWEEN $1 AND $2 AND interviewer_id = $3 AND slot_id NOT IN (SELECT time_slot FROM bookings WHERE booking_date BETWEEN $1 AND $2)`
	rows, err := sqlDB.Query(query, startDate, endDate, interviewerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database query failed"})
		return
	}
	defer rows.Close()

	slots := []Slot{}
	for rows.Next() {
		var slot Slot
		if err := rows.Scan(&slot.SlotID, &slot.StartTime, &slot.EndTime, &slot.AvailableDate, &slot.UserID, &slot.Booked, &slot.BookedTime); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan slots"})
			return
		}
		slots = append(slots, slot)
	}

	if len(slots) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "No available slots found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"available_slots": slots})
}

// BookSlot books a slot for the user
func BookSlot(c *gin.Context) {
	type BookingRequest struct {
		UserID        int    `json:"user_id" binding:"required"`
		SlotID        int    `json:"slot_id" binding:"required"`
		Email         string `json:"email" binding:"required"`
		Name          string `json:"name" binding:"required"`
		BookedBy      string `json:"booked_by" binding:"required"`
		InterviewerID int    `json:"interviewer_id" binding:"required"`
		TimeSlot      string `json:"time_slot" binding:"required"`
	}

	var req BookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	var slotExists bool
	existQuery := `SELECT EXISTS(SELECT 1 FROM bookings WHERE time_slot = $1 AND booking_date = CURRENT_DATE AND interviewer_id = $2)`
	if err := sqlDB.QueryRow(existQuery, req.TimeSlot, req.InterviewerID).Scan(&slotExists); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check slot availability"})
		return
	}

	if slotExists {
		c.JSON(http.StatusConflict, gin.H{"message": "Slot already booked"})
		return
	}

	insertQuery := `INSERT INTO bookings (user_id, slot_date, slot_time, email, status, created_at, updated_at, slot_id, booked_by, booked_at, start_time, end_time, name, interviewer_id, time_slot, booking_date) VALUES ($1, CURRENT_DATE, $2, $3, 'booked', NOW(), NOW(), $4, $5, NOW(), CURRENT_TIME, CURRENT_TIME + INTERVAL '1 hour', $6, $7, $8, CURRENT_DATE)`
	_, err := sqlDB.Exec(insertQuery, req.UserID, req.TimeSlot, req.Email, req.SlotID, req.BookedBy, req.Name, req.InterviewerID, req.TimeSlot)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to book slot"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Slot booked successfully"})
}
