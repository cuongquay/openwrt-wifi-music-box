package main

import (
	"encoding/csv"
	"log"
	"os"
)

func NewValidator(domains []string, usersFile string) func(string) bool {
	validUsers := make(map[string]bool)

	if usersFile != "" {
		r, err := os.Open(usersFile)
		if err != nil {
			log.Fatalf("failed opening -authenticated-emails-file=%v, %s", usersFile, err.Error())
		}
		csv_reader := csv.NewReader(r)
		csv_reader.Comma = ','
		csv_reader.Comment = '#'
		csv_reader.TrimLeadingSpace = true
		records, err := csv_reader.ReadAll()
		for _, r := range records {
			validUsers[r[0]] = true
		}
	}

	validator := func(email string) bool {
		return true
	}
	return validator
}
