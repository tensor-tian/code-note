package main

import (
	"fmt"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

var db *gorm.DB

func initDB() error {
	// db, err = gorm.Open(sqlite.Open(os.Getenv("DB")), &gorm.Config{})
	dsn := "root:vtu123456@tcp(0.0.0.0:3306)/block_note?charset=utf8mb4&parseTime=True&loc=Asia%2FShanghai"
	db, err := gorm.Open(mysql.New(mysql.Config{
		DSN:                       dsn,
		DefaultStringSize:         256,
		SkipInitializeWithVersion: false,
	}), &gorm.Config{
		Logger: gormLogger.Default.LogMode(gormLogger.Info),
		
	})
	if err != nil {
		return fmt.Errorf("failed to connect database: %v", err)
	}
	err = db.Set("gorm:table_options", "ENGINE=InnoDB").AutoMigrate(&Repository{}, &Block{}, &Topic{})
	return err
}

// Model is a gorm base model
type Model struct {
	ID uint `gorm:"primaryKey"`

	CreatedAt time.Time
	UpdatedAt time.Time
}

// Repository is a repostiory
type Repository struct {
	Model

	Name        *string `gorm:"64"`
	URL         *string `gorm:"size:128"`
	Description *string `gorm:"size:256"`
	Directory   string  `gorm:"size:256;not null;uniqueIndex"`
	Language    *string `gorm:"size:30"`
}

// Block is a code note block
type Block struct {
	Model

	RepoID    uint
	Repo      Repository `gorm:"foreignKey:RepoID;references:ID"`
	File      string     `gorm:"size:256" binding:"required" json:"file"`
	LineNums  string     `gorm:"size:32" binding:"required" json:"lineNums"`
	Code      string     `gorm:"type:text" binding:"required" json:"code"`
	Text      string     `gorm:"type:text" binding:"required" json:"text"`
	Focus     *string    `gorm:"size:64" json:"focus"`
	ParentID  uint
	Children  []Block `gorm:"foreignKey:ParentID;references:ID"`
	SerialNum uint
}

// Topic is consist of code blocks tree
type Topic struct {
	Model

	Text      string `gorm:"type:text"`
	RootID    uint
	RootBlock Block `gorm:"foreignKey:RootID;references:ID"`
}
