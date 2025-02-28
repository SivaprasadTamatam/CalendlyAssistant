// Import axios for making API calls
import axios from 'axios';

// Base API URL for backend calendar operations
const API_BASE_URL = 'http://localhost:8080/api/calendar';

/**
 * Fetch available time slots for an interviewer.
 * @param {string} interviewerId
 * @param {string} date - Formatted date string (e.g., "yyyy-MM-dd")
 * @returns {Promise<Array>}
 */
export async function fetchAvailableSlots(interviewerId, date) {
  try {
    const formattedDate = new Date(date).toISOString().split('T')[0]; // Ensures consistent format
    const response = await axios.get(`${API_BASE_URL}/slots/${interviewerId}/${formattedDate}`);
    return response.data.slots || [];
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return [];
  }
}

/**
 * Book a time slot for a candidate.
 * @param {string} candidateId
 * @param {string} slotId
 * @returns {Promise<Object>}
 */
export async function bookTimeSlot(candidateId, slotId) {
  try {
    const response = await axios.post(`${API_BASE_URL}/book`, {
      candidateId,
      slotId,
    });
    return response.data;
  } catch (error) {
    console.error('Error booking time slot:', error);
    throw error;
  }
}

/**
 * Create a new time slot for an interviewer.
 * @param {Object} slotDetails - { interviewerId, startTime, endTime }
 * @returns {Promise<Object>}
 */
export async function createTimeSlot(slotDetails) {
  try {
    const response = await axios.post(`${API_BASE_URL}/slots`, slotDetails);
    return response.data;
  } catch (error) {
    console.error('Error creating time slot:', error);
    throw error;
  }
}

/**
 * Handle slot conflicts by checking for overlaps.
 * @param {Array} existingSlots - List of current slots
 * @param {Object} newSlot - { startTime, endTime }
 * @returns {boolean} true if conflict, false otherwise
 */
export function hasSlotConflict(existingSlots, newSlot) {
  return existingSlots.some(slot => 
    newSlot.startTime < slot.endTime && newSlot.endTime > slot.startTime
  );
}

/**
 * Notify user about booking status (Email/SMS example).
 * @param {string} userId
 * @param {string} message
 */
export async function sendNotification(userId, message) {
  try {
    await axios.post(`${API_BASE_URL}/notify`, { userId, message });
    console.log('Notification sent');
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}
