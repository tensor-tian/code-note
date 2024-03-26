package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func checkHealth(c *gin.Context) {
	c.String(http.StatusOK, "ok")
}

type addBlockBody struct {
	Block
	Project string `json:"project" binding:"required"`
}

func addBlock(c *gin.Context) {
	body := addBlockBody{}
	err := c.ShouldBindJSON(&body)
	if err != nil {
		c.PureJSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}
	block := body.Block
	repo, err := getRepo(body.Project)
	if err == nil {
		block.RepoID = repo.ID
	}
	lastBlock := Block{}
	db.Where("Parent = ?", nil).Order("SerialNum DESC").Take(&lastBlock)
	if lastBlock.ID > 0 {
		block.SerialNum = lastBlock.ID + 1
	}
	tx := db.Select("RepoID", "File", "LineNums", "Code", "Text", "Focus", "SerialNum").Create(&block)
	if tx.Error != nil {
		logger.Printf("create block failed %v\n", tx.Error)
		c.PureJSON(http.StatusInternalServerError, gin.H{
			"message": tx.Error.Error(),
		})
		return
	}
	c.PureJSON(http.StatusOK, block)
}
