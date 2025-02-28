package routes

import (
	"BookingTimeSlot/backend/pkg"

	"net/http"

	"github.com/gin-gonic/gin"
)

// SetUpRoutes initializes the routes for booking and availability
func SetUpRoutes(router *gin.Engine) {
	// POST endpoint: Create a booking
	router.POST("/bookings", func(c *gin.Context) {
		var booking pkg.Booking

		// Bind incoming JSON to booking model
		if err := c.ShouldBindJSON(&booking); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		// Check if slot already booked for given date
		var existingBooking pkg.Booking
		if err := pkg.DB.Where("slot = ? AND date = ?", booking.Slot, booking.Date).First(&existingBooking).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Slot already booked"})
			return
		}

		// Save the booking
		if err := pkg.DB.Create(&booking).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create booking"})
			return
		}

		// Success response
		c.JSON(http.StatusOK, gin.H{
			"message": "Booking successfully created",
			"booking": booking,
		})
	})

	// GET endpoint: Retrieve all bookings
	router.GET("/bookings", func(c *gin.Context) {
		var bookings []pkg.Booking
		if err := pkg.DB.Find(&bookings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve bookings"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"bookings": bookings})
	})

	// GET endpoint: Retrieve available slots for a specific date
	router.GET("/availability", func(c *gin.Context) {
		date := c.Query("date")
		if date == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Date is required"})
			return
		}

		// Retrieve bookings for the given date
		var bookings []pkg.Booking
		if err := pkg.DB.Where("date = ?", date).Find(&bookings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve bookings"})
			return
		}

		// All available slots
		allSlots := []string{"9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"}
		availableSlots := []string{}

		// Filter out booked slots
		for _, slot := range allSlots {
			isBooked := false
			for _, booking := range bookings {
				if booking.Slot == slot {
					isBooked = true
					break
				}
			}
			if !isBooked {
				availableSlots = append(availableSlots, slot)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"date":            date,
			"available_slots": availableSlots,
			"total_available": len(availableSlots),
		})
	})
}
