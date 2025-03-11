package config

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres" // PostgreSQL driver
	"gorm.io/gorm"            // GORM ORM for Go
)

// Config holds the database connection parameters
type Config struct {
	Host     string
	Port     int
	User     string
	Password string
	Database string
}

// GetConfig returns the database configuration
func GetConfig() *Config {
	// Fetch database credentials from environment variables (fallback to provided defaults)
	return &Config{
		Host:     getEnv("DB_HOST", "localhost"),              // PostgreSQL server address
		Port:     getEnvAsInt("DB_PORT", 5432),                // PostgreSQL port
		User:     getEnv("DB_USER", "postgres"),               // PostgreSQL username
		Password: getEnv("DB_PASSWORD", "jingle_bell_jingle"), // PostgreSQL password
		Database: getEnv("DB_NAME", "postgres"),               // Database name
	}
}

// ConnectDB connects to the PostgreSQL database using the provided config
func ConnectDB() *gorm.DB {
	config := GetConfig()

	// Format the connection string
	connStr := fmt.Sprintf(
		"user=%s password=%s dbname=%s host=%s port=%d sslmode=disable",
		config.User, config.Password, config.Database, config.Host, config.Port,
	)

	// Establish the connection
	db, err := gorm.Open(postgres.Open(connStr), &gorm.Config{})
	if err != nil {
		log.Fatalf("⚠️ Failed to connect to database: %v", err)
		return nil // This is unnecessary since log.Fatalf will terminate the program
	}

	// Test the database connection
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("⚠️ Error retrieving database instance: %v", err)
		return nil
	}

	// Ping the database to ensure it's reachable
	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("⚠️ Database connection test failed: %v", err)
		return nil
	}

	log.Println("Database connected successfully!")
	return db
}

// Helper function to get environment variables with a fallback value
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// Helper function to get environment variables as integers
func getEnvAsInt(key string, fallback int) int {
	if value, exists := os.LookupEnv(key); exists {
		var intValue int
		_, err := fmt.Sscanf(value, "%d", &intValue)
		if err == nil {
			return intValue
		}
		log.Printf("⚠️ Invalid value for %s, using fallback: %d", key, fallback)
	}
	return fallback
}
