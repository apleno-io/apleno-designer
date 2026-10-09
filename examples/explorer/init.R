# Runs once, before the form is displayed: data, choices and functions used by
# the interfaces.

# R built-in datasets: no data file needed
datasets_list <- list(
    mtcars = mtcars,
    iris = iris,
    airquality = airquality
)

# Options of the "dataset" select, read through its choicesLanguageValues and
# choicesLanguageTexts properties
dataset_values <- names(datasets_list)
dataset_texts <- c("Motor cars", "Iris flowers", "New York air quality")

numeric_columns <- function(name)
{
    return(names(Filter(is.numeric, datasets_list[[name]])))
}

# Options of the "variable" select, filled from code: before the form is shown,
# and again each time the dataset changes (codeOnChange of the "dataset" select)
form_step <- rpgm.step("main", "form")
gui.addChoices(form_step, "variable", numeric_columns("mtcars"), numeric_columns("mtcars"))

update_variables <- function(name)
{
    columns <- numeric_columns(name)
    gui.clearChoices("this", "variable")
    #gui.addChoices("this", "variable", columns, columns)
    #gui.setValue("this", "variable", columns[1])
}

# Plotly figure of the "chart_graph" widget (graphVariable of results.pgui).
# Arrays are sent as lists.
make_plot <- function(values, variable, bins, chart, chart_title)
{
    trace <- if(chart == "box")
        list(y = as.list(values), type = "box", name = variable, marker = list(color = "#2980b9"))
    else
        list(x = as.list(values), type = "histogram", nbinsx = bins, marker = list(color = "#2980b9"))

    return(list(
        data = list(trace),
        layout = list(
            title = if(!is.null(chart_title) && nchar(chart_title) > 0) chart_title else variable,
            xaxis = list(title = if(chart == "box") "" else variable),
            margin = list(t = 50)
        )
    ))
}
