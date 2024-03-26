package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path"

	"golang.org/x/mod/modfile"
)

func getRepo(directory string) (Repository, error) {
	repo := Repository{}
	tx := db.Where("directory = ?", directory).First(&repo)
	if tx.Error == nil {
		return repo, nil
	}
	repo.Directory = directory
	jsPkg, found, err := tryReadPackageJSON(directory)
	if found {
		if err != nil {
			return repo, err
		}
		repo.Name = &jsPkg.Name
		lang := "js"
		repo.Language = &lang
		repo.Description = &jsPkg.Description
		tx = db.Select("Name", "Description", "Directory", "Language").Create(&repo)
		return repo, tx.Error
	}
	var goMod *modfile.File
	goMod, found, err = tryReadGoMod(directory)
	if found {
		if err != nil {
			return repo, err
		}
		repo.Name = &goMod.Module.Mod.Path
		lang := "go"
		repo.Language = &lang
		tx = db.Select("Name", "Description", "Directory", "Language").Create(&repo)
		return repo, tx.Error
	}
	return repo, fmt.Errorf("not support such type of pacakge %s", directory)
}

func existsFile(file string) bool {
	_, err := os.Stat(file)
	return err == nil
}

type packageJSON struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func tryReadPackageJSON(directory string) (*packageJSON, bool, error) {
	file := path.Join(directory, "package.json")
	if !existsFile(file) {
		return nil, false, errors.New("package.json is not exists")
	}
	bytes, err := os.ReadFile(file)
	if err != nil {
		return nil, true, fmt.Errorf("read config file %s failed, %w", file, err)
	}
	data := packageJSON{}
	err = json.Unmarshal(bytes, &data)
	if err != nil {
		return &data, true, fmt.Errorf("decode %s content failed: %w", file, err)
	}
	return &data, true, nil
}

func tryReadGoMod(directory string) (*modfile.File, bool, error) {
	file := path.Join(directory, "go.mod")
	if !existsFile(file) {
		return nil, false, errors.New("go.mod is not exists")
	}
	bytes, err := os.ReadFile(file)
	if err != nil {
		return nil, true, fmt.Errorf("read %s failed", file)
	}
	f, err := modfile.Parse("go.mod", bytes, nil)
	if err != nil {
		return nil, true, fmt.Errorf("parse %s failed: %w", file, err)
	}
	return f, true, nil
}
