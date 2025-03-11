package pkg

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// -------------------- Models --------------------

// Booking holds information about a booking.
type Booking struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name"`
	Email       string    `json:"email"`
	SlotID      uint      `json:"slot_id"`
	UserID      int       `json:"user_id"`
	BookingDate time.Time `json:"booking_date"`
	Status      string    `json:"status"`
	Slot        string    `json:"slot"`
	Date        string    `json:"date"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TimeSlot represents available interview time slots.
type TimeSlot struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	InterviewerID uint      `json:"interviewer_id" gorm:"index"`
	StartTime     time.Time `json:"start_time"`
	EndTime       time.Time `json:"end_time"`
	IsBooked      bool      `json:"is_booked"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// -------------------- Auto Migration --------------------

// AutoMigrateTables initializes all tables.
func AutoMigrateTables(db *gorm.DB) error {
	return db.AutoMigrate(&TimeSlot{}, &Booking{})
}

// -------------------- Booking Functions --------------------

// CreateBooking inserts a new booking and marks the timeslot as booked.
func CreateBooking(db *gorm.DB, userID int, slotID uint, name, email, status string) (*Booking, error) {
	// Validate input fields
	if name == "" || email == "" {
		return nil, errors.New("name and email are required")
	}

	// Check if the timeslot exists
	var slot TimeSlot
	if err := db.First(&slot, slotID).Error; err != nil {
		return nil, errors.New("time slot not found")
	}

	// Validate slot availability
	if slot.IsBooked {
		return nil, errors.New("time slot is already booked")
	}

	// Validate booking date (no past dates)
	if slot.StartTime.Before(time.Now()) {
		return nil, errors.New("cannot book a past time slot")
	}

	booking := Booking{
		Name:        name,
		Email:       email,
		SlotID:      slotID,
		UserID:      userID,
		BookingDate: time.Now(),
		Status:      status,
		Slot:        slot.StartTime.Format("15:04") + " - " + slot.EndTime.Format("15:04"),
		Date:        slot.StartTime.Format("2006-01-02"),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Transaction: Create booking and update timeslot
	err := db.Transaction(func(tx *gorm.DB) error {
		// Create booking record
		if err := tx.Create(&booking).Error; err != nil {
			return errors.New("failed to create booking")
		}

		// Mark the slot as booked
		if err := tx.Model(&slot).Update("is_booked", true).Error; err != nil {
			return errors.New("failed to update slot status")
		}

		return nil
	})

	return &booking, err
}

// GetBookingByID fetches a booking by ID.
func GetBookingByID(db *gorm.DB, id uint) (*Booking, error) {
	var booking Booking
	if err := db.First(&booking, id).Error; err != nil {
		return nil, errors.New("booking not found")
	}
	return &booking, nil
}

// UpdateBookingStatus changes the booking status and optionally releases the slot.
func UpdateBookingStatus(db *gorm.DB, bookingID uint, status string) error {
	var booking Booking
	if err := db.First(&booking, bookingID).Error; err != nil {
		return errors.New("booking not found")
	}

	return db.Transaction(func(tx *gorm.DB) error {
		// Update booking status
		if err := tx.Model(&booking).Updates(map[string]interface{}{"status": status, "updated_at": time.Now()}).Error; err != nil {
			return errors.New("failed to update booking status")
		}

		// Release slot if booking is cancelled
		if status == "cancelled" {
			if err := tx.Model(&TimeSlot{}).Where("id = ?", booking.SlotID).Update("is_booked", false).Error; err != nil {
				return errors.New("failed to release slot")
			}
		}

		return nil
	})
}

// -------------------- TimeSlot Functions --------------------

// FetchAvailabilityForInterviewer gets available slots for a specific interviewer and date.
func FetchAvailabilityForInterviewer(db *gorm.DB, interviewerID uint, date string) ([]TimeSlot, error) {
	startDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, errors.New("invalid date format; expected YYYY-MM-DD")
	}

	var timeSlots []TimeSlot
	err = db.Where("interviewer_id = ? AND start_time >= ? AND end_time <= ? AND is_booked = false",
		interviewerID, startDate, startDate.Add(24*time.Hour)).Find(&timeSlots).Error

	if err != nil {
		return nil, errors.New("failed to fetch availability")
	}
	if len(timeSlots) == 0 {
		return nil, errors.New("no available slots found for the given date")
	}

	return timeSlots, nil
}

// CreateTimeSlot adds a new timeslot for an interviewer.
func CreateTimeSlot(db *gorm.DB, interviewerID uint, startTime, endTime time.Time) (*TimeSlot, error) {
	// Validate times
	if endTime.Before(startTime) {
		return nil, errors.New("end time cannot be before start time")
	}
	if startTime.Before(time.Now()) {
		return nil, errors.New("cannot create a timeslot in the past")
	}

	slot := TimeSlot{
		InterviewerID: interviewerID,
		StartTime:     startTime,
		EndTime:       endTime,
		IsBooked:      false,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := db.Create(&slot).Error; err != nil {
		return nil, errors.New("failed to create timeslot")
	}

	return &slot, nil
}
