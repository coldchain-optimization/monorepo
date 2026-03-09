package utils

import (
"fmt"
"time"

"github.com/golang-jwt/jwt/v5"
)

type JWTUtil struct {
	secretKey string
}

func NewJWTUtil(secretKey string) *JWTUtil {
	return &JWTUtil{secretKey: secretKey}
}

type JWTClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken generates a JWT token for a user
func (ju *JWTUtil) GenerateToken(userID, email, role string) (string, error) {
	claims := &JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(ju.secretKey))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// VerifyToken verifies a JWT token and returns the claims
func (ju *JWTUtil) VerifyToken(tokenString string) (string, string, string, error) {
	claims := &JWTClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
return []byte(ju.secretKey), nil
})

	if err != nil {
		return "", "", "", fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return "", "", "", fmt.Errorf("invalid token")
	}

	return claims.UserID, claims.Email, claims.Role, nil
}
