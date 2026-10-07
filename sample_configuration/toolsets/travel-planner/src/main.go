package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	sdk "github.com/SolaceDev/solace-agent-mesh-go/pkg/samtoolsdk"
)

func main() {
	sdk.Run(
		sdk.NewTool("compile_itinerary",
			"Compile all travel data (flights, hotels, activities, weather) into a structured day-by-day itinerary document.",
			compileItinerary,
		),
		sdk.NewTool("calculate_budget",
			"Calculate a complete trip budget breakdown including flights, hotels, meals, and activities.",
			calculateBudget,
		),
	)
}

// --- compile_itinerary ---

type CompileItineraryParams struct {
	Destination string  `json:"destination" desc:"Travel destination city"`
	TravelDates string  `json:"travel_dates" desc:"Travel dates (e.g. 2025-03-15 to 2025-03-20)"`
	Flights     string  `json:"flights" desc:"JSON string of selected flight information"`
	Hotels      string  `json:"hotels" desc:"JSON string of selected hotel information"`
	Activities  *string `json:"activities" desc:"JSON string of recommended activities"`
	Weather     *string `json:"weather" desc:"JSON string of weather forecast"`
	Travelers   *int    `json:"travelers" desc:"Number of travelers (default 1)"`
}

func compileItinerary(ctx context.Context, p CompileItineraryParams, tc *sdk.ToolContext) (*sdk.Result, error) {
	travelers := 1
	if p.Travelers != nil && *p.Travelers > 0 {
		travelers = *p.Travelers
	}

	itinerary := map[string]any{
		"destination":  p.Destination,
		"travel_dates": p.TravelDates,
		"travelers":    travelers,
		"compiled_at":  time.Now().UTC().Format(time.RFC3339),
	}

	if p.Flights != "" {
		var flights any
		json.Unmarshal([]byte(p.Flights), &flights)
		itinerary["flights"] = flights
	}
	if p.Hotels != "" {
		var hotels any
		json.Unmarshal([]byte(p.Hotels), &hotels)
		itinerary["accommodation"] = hotels
	}
	if p.Activities != nil && *p.Activities != "" {
		var activities any
		json.Unmarshal([]byte(*p.Activities), &activities)
		itinerary["activities"] = activities
	}
	if p.Weather != nil && *p.Weather != "" {
		var weather any
		json.Unmarshal([]byte(*p.Weather), &weather)
		itinerary["weather_forecast"] = weather
	}

	dates := parseDateRange(p.TravelDates)
	if len(dates) > 0 {
		var days []map[string]any
		for i, d := range dates {
			day := map[string]any{"day": i + 1, "date": d}
			if i == 0 {
				day["note"] = "Arrival day"
			} else if i == len(dates)-1 {
				day["note"] = "Departure day"
			} else {
				day["note"] = "Exploration day"
			}
			days = append(days, day)
		}
		itinerary["day_by_day"] = days
		itinerary["total_days"] = len(dates)
	}

	return sdk.OK("Itinerary compiled successfully", sdk.WithData(itinerary)), nil
}

// --- calculate_budget ---

type CalculateBudgetParams struct {
	FlightCost      float64  `json:"flight_cost" desc:"Total flight cost per person"`
	HotelCost       float64  `json:"hotel_cost" desc:"Total hotel cost (all nights)"`
	NumDays         int      `json:"num_days" desc:"Number of trip days"`
	Travelers       *int     `json:"travelers" desc:"Number of travelers (default 1)"`
	Currency        *string  `json:"currency" desc:"Currency code (default USD)"`
	DailyMeals      *float64 `json:"daily_meals" desc:"Estimated daily meals budget per person (default 50)"`
	DailyActivities *float64 `json:"daily_activities" desc:"Estimated daily activities budget per person (default 30)"`
}

func calculateBudget(ctx context.Context, p CalculateBudgetParams, tc *sdk.ToolContext) (*sdk.Result, error) {
	travelers := 1
	if p.Travelers != nil && *p.Travelers > 0 {
		travelers = *p.Travelers
	}
	currency := "USD"
	if p.Currency != nil && *p.Currency != "" {
		currency = *p.Currency
	}
	dailyMeals := 50.0
	if p.DailyMeals != nil && *p.DailyMeals > 0 {
		dailyMeals = *p.DailyMeals
	}
	dailyActivities := 30.0
	if p.DailyActivities != nil && *p.DailyActivities > 0 {
		dailyActivities = *p.DailyActivities
	}

	totalFlights := p.FlightCost * float64(travelers)
	totalHotel := p.HotelCost
	totalMeals := dailyMeals * float64(p.NumDays) * float64(travelers)
	totalActivities := dailyActivities * float64(p.NumDays) * float64(travelers)
	grandTotal := totalFlights + totalHotel + totalMeals + totalActivities

	result := map[string]any{
		"currency":  currency,
		"travelers": travelers,
		"days":      p.NumDays,
		"breakdown": map[string]any{
			"flights":    fmt.Sprintf("%.2f", totalFlights),
			"hotel":      fmt.Sprintf("%.2f", totalHotel),
			"meals":      fmt.Sprintf("%.2f", totalMeals),
			"activities": fmt.Sprintf("%.2f", totalActivities),
		},
		"grand_total": fmt.Sprintf("%.2f %s", grandTotal, currency),
		"per_person":  fmt.Sprintf("%.2f %s", grandTotal/float64(travelers), currency),
	}

	return sdk.OK("Budget calculated successfully", sdk.WithData(result)), nil
}

func parseDateRange(dateStr string) []string {
	parts := strings.Split(dateStr, " to ")
	if len(parts) != 2 {
		parts = strings.Split(dateStr, " - ")
	}
	if len(parts) != 2 {
		return nil
	}
	start, err1 := time.Parse("2006-01-02", strings.TrimSpace(parts[0]))
	end, err2 := time.Parse("2006-01-02", strings.TrimSpace(parts[1]))
	if err1 != nil || err2 != nil {
		return nil
	}
	var dates []string
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		dates = append(dates, d.Format("2006-01-02"))
	}
	return dates
}
