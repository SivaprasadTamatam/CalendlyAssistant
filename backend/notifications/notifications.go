package main

import (
	"fmt"
	"log"
	"net/smtp"
	"os"

	"github.com/joho/godotenv"
)

// sendEmail sends an email using SMTP
func sendEmail(recipient, subject, body string) error {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: No .env file found, using system environment variables.")
	}

	// Get email credentials from environment variables
	email := os.Getenv("EMAIL")
	password := os.Getenv("EMAIL_PASSWORD")

	// Validate that credentials are set
	if email == "" || password == "" {
		return fmt.Errorf("email or password not set in environment variables")
	}

	// SMTP server details (Gmail in this case)
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	// Set up authentication using PlainAuth
	auth := smtp.PlainAuth("", email, password, smtpHost)

	// Construct the email message
	msg := "From: " + email + "\r\n" +
		"To: " + recipient + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-version: 1.0;\r\n" +
		"Content-Type: text/plain; charset=\"UTF-8\";\r\n\r\n" +
		body + "\r\n"

	// Send the email
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, email, []string{recipient}, []byte(msg))
	if err != nil {
		return fmt.Errorf("error sending email: %v", err)
	}

	log.Println("Email sent successfully to:", recipient)
	return nil
}

func main() {
	// Example: Sending an email
	recipient := "recipient@example.com"
	subject := "Subject of the email"
	body := "Body of the email"

	err := sendEmail(recipient, subject, body)
	if err != nil {
		log.Fatalf("Failed to send email: %v", err)
	} else {
		fmt.Println("Email sent successfully!")
	}
}
