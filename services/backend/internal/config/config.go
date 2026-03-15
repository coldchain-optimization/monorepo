package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost        string
	DBPort        string
	DBUser        string
	DBPassword    string
	DBName        string
	JWTSecret     string
	ServerPort    string
	Environment   string
	MLEnabled     bool
	MLServiceURL  string
	MLTimeoutMs   int
	MLBlendWeight float64
}

func LoadConfig() *Config {
	// Load .env file if it exists
	_ = godotenv.Load()

	return &Config{
		DBHost:        getEnv("DB_HOST", "localhost"),
		DBPort:        getEnv("DB_PORT", "5432"),
		DBUser:        getEnv("DB_USER", "postgres"),
		DBPassword:    getEnv("DB_PASSWORD", "postgres"),
		DBName:        getEnv("DB_NAME", "looplink"),
		JWTSecret:     getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		ServerPort:    getEnv("SERVER_PORT", "8080"),
		Environment:   getEnv("ENVIRONMENT", "development"),
		MLEnabled:     getEnvBool("ML_ENABLED", false),
		MLServiceURL:  getEnv("ML_SERVICE_URL", "http://localhost:8000/optimize"),
		MLTimeoutMs:   getEnvInt("ML_TIMEOUT_MS", 1200),
		MLBlendWeight: getEnvFloat("ML_BLEND_WEIGHT", 0.35),
	}
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}

func getEnvBool(key string, defaultVal bool) bool {
	value, exists := os.LookupEnv(key)
	if !exists {
		return defaultVal
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return defaultVal
	}
	return parsed
}

func getEnvInt(key string, defaultVal int) int {
	value, exists := os.LookupEnv(key)
	if !exists {
		return defaultVal
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return defaultVal
	}
	return parsed
}

func getEnvFloat(key string, defaultVal float64) float64 {
	value, exists := os.LookupEnv(key)
	if !exists {
		return defaultVal
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return defaultVal
	}
	return parsed
}
