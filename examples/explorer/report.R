# Script of the report.pseq sub-sequence. It shares the R session of the main
# sequence: the variables of the previous steps are available.

rows <- paste0("<tr><td>", stats_table$Statistic, "</td><td>", stats_table$Value, "</td></tr>", collapse = "\n")
html <- paste0(
    "<html><head><meta charset=\"utf-8\"><title>", variable, "</title></head><body>",
    "<h1>", variable, " (", dataset, ")</h1>",
    "<table border=\"1\" cellpadding=\"4\">", rows, "</table>",
    "</body></html>"
)

report_file <- rpgm.outputFile(paste0(dataset, "_", variable, "_report.html"))
writeLines(html, report_file, useBytes = TRUE)
rpgm.addToEndScreen(report_file)
