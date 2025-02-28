package pkg

import (
	"gorm.io/gorm"
)

// Event represents an event that is booked using a time slot
type Event struct {
	gorm.Model
	TimeSlotID  uint   `json:"time_slot_id" gorm:"not null;constraint:OnDelete:CASCADE;"` // Foreign key referencing the time slot
	BookedBy    string `json:"booked_by" gorm:"not null"`                                 // Email or name of the person who booked the event
	Title       string `json:"title" gorm:"not null"`                                     // Title of the event
	Description string `json:"description"`                                               // Description of the event
}

// AutoMigrateEvents initializes the Event table schema in the database
func AutoMigrateEvents(db *gorm.DB) error {
	// Automatically migrate the Event schema
	if err := db.AutoMigrate(&Event{}); err != nil {
		return err
	}
	return nil
}

// CreateEvent creates a new event in the database
func CreateEvent(db *gorm.DB, timeSlotID uint, bookedBy, title, description string) (*Event, error) {
	event := Event{
		TimeSlotID:  timeSlotID,
		BookedBy:    bookedBy,
		Title:       title,
		Description: description,
	}

	if err := db.Create(&event).Error; err != nil {
		return nil, err
	}
	return &event, nil
}

// GetEventByID retrieves an event by its ID
func GetEventByID(db *gorm.DB, id uint) (*Event, error) {
	var event Event
	if err := db.First(&event, id).Error; err != nil {
		return nil, err
	}
	return &event, nil
}

// UpdateEvent updates the details of an existing event
func UpdateEvent(db *gorm.DB, id uint, title, description string) (*Event, error) {
	var event Event
	if err := db.First(&event, id).Error; err != nil {
		return nil, err
	}

	// Update event details
	event.Title = title
	event.Description = description

	if err := db.Save(&event).Error; err != nil {
		return nil, err
	}
	return &event, nil
}
