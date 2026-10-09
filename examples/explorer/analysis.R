# Runs after the form is submitted: the widgets of form.pgui are now R variables
# named after their customId (dataset, variable, bins, chart, chart_title).

script.setProgress(TRUE, 0, "Reading the data...")
values <- datasets_list[[dataset]][[variable]]
missing_count <- sum(is.na(values))
values <- values[!is.na(values)]

script.setProgress(TRUE, 50, "Computing statistics...")
stats_table <- data.frame(
    Statistic = c("Count", "Missing", "Mean", "Median", "Std. deviation", "Min", "Max"),
    Value = round(c(length(values), missing_count, mean(values), median(values), sd(values), min(values), max(values)), 2)
)
summary_html <- paste0(
    "<b>", variable, "</b> in <b>", dataset, "</b>: ", length(values), " values",
    if(missing_count > 0) paste0(" (", missing_count, " missing values ignored)") else "",
    "."
)

# Generated files go to the output folder and are listed on the end screen
script.setProgress(TRUE, 80, "Exporting...")
csv_file <- rpgm.outputFile(paste0(dataset, "_", variable, "_statistics.csv"))
write.csv(stats_table, csv_file, row.names = FALSE)
rpgm.addToEndScreen(csv_file)

script.setProgress(FALSE, 100, "")
