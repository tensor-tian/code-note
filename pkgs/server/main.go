package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

var logger *log.Logger

func init() {
	checkErr(godotenv.Load())
	checkErr(initDB())
	// Info is a Logger with LogLevel INF
	logger = log.New(os.Stderr, "INF: ", log.LstdFlags|log.Llongfile|log.Lmsgprefix)
}

func setupRouter() *gin.Engine {

	gin.ForceConsoleColor()
	router := gin.Default()

	router.GET("/api/check", checkHealth)
	router.POST("/api/add-block", addBlock)

	return router
}

func main() {
	r := setupRouter()
	// Listen and Server in 0.0.0.0:8080
	r.Run(":8080")
}

func checkErr(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
