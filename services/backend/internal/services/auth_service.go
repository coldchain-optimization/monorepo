package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/repository"
	"looplink.com/backend/internal/utils"
)

type AuthService struct {
	userRepo *repository.UserRepository
	jwtUtil  *utils.JWTUtil
}

func NewAuthService(userRepo *repository.UserRepository, jwtUtil *utils.JWTUtil) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		jwtUtil:  jwtUtil,
	}
}

// SignUp creates a new user account
func (as *AuthService) SignUp(email, password, firstName, lastName, role string) (*domain.User, string, error) {
	// Check if user already exists
	_, err := as.userRepo.GetUserByEmail(email)
	if err == nil {
		return nil, "", fmt.Errorf("user already exists")
	}
	if err.Error() != "user not found" {
		return nil, "", err
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &domain.User{
		ID:        uuid.New().String(),
		Email:     email,
		Password:  string(hashedPassword),
		FirstName: firstName,
		LastName:  lastName,
		Role:      role,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := as.userRepo.CreateUser(user); err != nil {
		return nil, "", fmt.Errorf("failed to create user: %w", err)
	}

	// Generate JWT token
	token, err := as.jwtUtil.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate token: %w", err)
	}

	return user, token, nil
}

// Login authenticates a user and returns a JWT token
func (as *AuthService) Login(email, password string) (*domain.User, string, error) {
	// Get user by email
	user, err := as.userRepo.GetUserByEmail(email)
	if err != nil {
		if err.Error() == "user not found" {
			return nil, "", fmt.Errorf("invalid credentials")
		}
		return nil, "", err
	}

	fmt.Printf("[AUTH DEBUG] User found: %s, DB Password: '%s', Input Password: '%s'\n", email, user.Password, password)

	// Compare password
	bcryptErr := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	fmt.Printf("[AUTH DEBUG] Bcrypt err: %v\n", bcryptErr)

	if bcryptErr != nil {
		// Dev fallback: allow plain-text seeded passwords.
		fmt.Printf("[AUTH DEBUG] Plain text check: '%s' == '%s' ? %v\n", user.Password, password, user.Password == password)
		if user.Password != password {
			return nil, "", fmt.Errorf("invalid credentials")
		}
	}

	// Generate JWT token
	token, err := as.jwtUtil.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate token: %w", err)
	}

	return user, token, nil
}

// GetUserByID retrieves a user by ID
func (as *AuthService) GetUserByID(id string) (*domain.User, error) {
	return as.userRepo.GetUserByID(id)
}

// VerifyToken verifies a JWT token
func (as *AuthService) VerifyToken(token string) (string, string, string, error) {
	return as.jwtUtil.VerifyToken(token)
}
