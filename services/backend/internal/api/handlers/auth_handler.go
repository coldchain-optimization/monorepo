package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"looplink.com/backend/internal/services"
	"looplink.com/backend/internal/utils"
)

type AuthHandler struct {
	authService *services.AuthService
	jwtUtil     *utils.JWTUtil
}

func NewAuthHandler(authService *services.AuthService, jwtUtil *utils.JWTUtil) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		jwtUtil:     jwtUtil,
	}
}

// SignUp handles user registration
func (ah *AuthHandler) SignUp(c *gin.Context) {
	var req struct {
		Email     string `json:"email" binding:"required"`
		Password  string `json:"password" binding:"required"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Role      string `json:"role"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Role == "" {
		req.Role = "shipper"
	}

	user, token, err := ah.authService.SignUp(req.Email, req.Password, req.FirstName, req.LastName, req.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user":    user,
		"token":   token,
	})
}

// Login handles user login
func (ah *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, token, err := ah.authService.Login(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

// RefreshToken handles token refresh
func (ah *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, email, role, err := ah.jwtUtil.VerifyToken(req.Token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	newToken, err := ah.jwtUtil.GenerateToken(userID, email, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": newToken})
}

// GetProfile returns the authenticated user's profile
func (ah *AuthHandler) GetProfile(c *gin.Context) {
	userID := c.GetString("user_id")

	user, err := ah.authService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}
