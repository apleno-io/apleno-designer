# Script of report.pseq. The app jumped to this sequence for good (a sequence
# step has no exit): its end step ends the app. It still shares the R session of
# main.pseq, so the variables of the last analysis are available.

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
