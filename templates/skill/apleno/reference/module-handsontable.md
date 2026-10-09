# Handsontable module (R)

> Source: Apleno documentation (modules/handsontable). An optional R module, installed in `modules/handsontable/` of the project.


## Handsontable module

The Handsontable module is an R Apleno Designer module for controlling a
Handsontable grid in a GUI. The current version of the module is **1.0.1**.
Changelog can be found [here](https://github.com/pgmsolutions/module-handsontable/releases).

- The source are available on the [Github repository](https://github.com/pgmsolutions/module-handsontable);
- All releases are also available on [Github releases page](https://github.com/pgmsolutions/module-handsontable/releases);
- The current Handsontable version shipped with the module is 14.1.0.

An Apleno Designer example project is also
[available here](https://github.com/pgmsolutions/app-handsontable-example).

## Installing the Handsontable module

To install the module, download the latest release file from the github page:

- [Download latest release](https://github.com/pgmsolutions/module-handsontable/releases/latest/download/module-handsontable.zip)

Unzip the file so that all the files in the zip are in a folder named
`modules/handsontable` in the root folder of your Apleno Designer project. You
should have a `modules/handsontable/main.R` file.

Open your ppro file and add the following lines in the **Custom CSS/JS files**
field:

```
modules/handsontable/resources/handsontable.full.min.js
modules/handsontable/resources/handsontable.full.min.css
modules/handsontable/main.js
modules/handsontable/main.css
```

!!! warning

    Please note that for commercial use you need to have a license from
    Handonstable. More information on
    [the official Handonstable website](https://handsontable.com/pricing). The
    license key should then be used in the `licenseKey` option of
    `Handonstable.create` function.

The module is installed!

## Handsontable module usage

Create a new empty label widget in a GUI and give it a unique id, like
`myTable`. Then create a new R file and add it to the sequencer before the GUI
containing the table. In the R file, source the module:

```r
source(rpgm.pgmFilePath('modules/handsontable/main.R'))
```

You can then initialize the table. This must be done before entering the GUI
with the table.

```r
Handsontable.create(
    'main',
    rpgm.step('main', 'handsontable'),
    'myTable',
    height = 512,
    # Options are the Handsontable options, see https://handsontable.com/docs/javascript-data-grid/api/options/
    options = list(
        data=mtcars,
        rowHeaders=TRUE,
        colHeaders=TRUE,

        autoColumnSize=TRUE,
        columnSorting=TRUE,
        manualColumnResize=TRUE,

        rowHeaderWidth=50,
        colWidths=c(100, 150, 100, 100, 100, 100, 50, 50, 50, 50),
        width='100%',
        stretchH='all',

        autoWrapRow=TRUE,
        autoWrapCol=TRUE,

        filters=TRUE,
        dropdownMenu=TRUE,

        licenseKey='non-commercial-and-evaluation' # You should enter your commercial license key here.
    )
);
```

See the `Handsontable.create()` section for more information on the parameters.
The `options` parameter is the Handonstable options object, converted to list.
You can find all options in the
[official documentation of Handsontable here](https://handsontable.com/docs/javascript-data-grid/api/options/).
When calling function for modifying the table, always use the `myTable` id for
the `tableId` parameter in functions. You can setup event listener to change the
behaviour of the table depending on the user's inputs (see [Events](#events)).

## Handsontable module methods

In the following functions, `tableId` always refers to the unique id of a single
table in the GUI, as defined in the `Handsontable.create` function with the
`tableId` parameter.

### Handsontable.create

```r
Handsontable.create(tableId, step, widgetId, height = 512, options = list())
```

Create a new table widget. This function must be called before entering the GUI
containing the table.

- `tableId` is a unique name you give to the grid;
- `step` is the step where the table will be, created with `rpgm.step()`;
- `widgetId` is the id of the label widget that will contain the table;
- `height` is the height of the grid in pixels;
- `options` is the table options as defined by the
  [Handsontable parameters](https://handsontable.com/docs/javascript-data-grid/api/options/).

Please note that the module only accept a data frame with the `data` option with
some additionnal checks and option setup:

- The `height` option of Handsontable will be automatically set to the `height`
  parameter of the function;
- If the `rowHeaders` is set to `TRUE`, it will be replaced by the row names of
  the data frame;
- If the `colHeaders` is set to `TRUE`, it will be replaced by the columns names
  of the data frame;
- If no `columns` option are set, the module will automatically call the
  `Handsontable.getColumnsFromDF` function to generate this option.

### Handsontable.getColumnsFromDF

```r
Handsontable.getColumnsFromDF(df)
```

Return a list of column object to use with the `columns` option of Handonstable.
If `columns` is not specified, the module automatically call this function on
the data frame for the columns option. See
[here for the option](https://handsontable.com/docs/javascript-data-grid/api/options/#columns)
and
[here for cell types](https://handsontable.com/docs/javascript-data-grid/cell-type/).

### Handsontable.injectRowNames

```r
Handsontable.injectRowNames(df, columnName)
```

Extract the row names from a data frame and add them to a new column as the
first column of the df, named `columnName`. This function is for convenient
changing a data frame because Handonstable does not allow modifying row names,
and do not correctly work with sorting and custom row names.

### Handsontable.on

```r
Handsontable.on(tableId, eventName, callback)
```

Add a new event listener. See the [Events](#events) section for more
information.

### Handsontable.off

```r
Handsontable.off(tableId, eventName, callback)
```

Remove an existing event listener. See the [Events](#events) section for
more information.

### Handsontable.update

```r
Handsontable.update(tableId, options)
```

Update the settings and data of a table by overwriting its options.

## Handsontable module events

The Handsontable module comes with an event system where you can add functions
that will be called when something happens on the grid. To setup a new hook on
an event, you have to call `Handsontable.on()` with the unique id of your table,
the event and your callback function. Additional parameters are in a list passed
as the first argument to the function. Here is an example:

```r
Handsontable.on('main', 'onDidChangeSelection', function(selection){
    if(is.null(selection)){
        cat("Selection: nothing is selected!\n")
    }
    else {
        cat(paste0("Selection: from (",selection[[1L]],",",selection[[2L]],") to (",selection[[3L]],",",selection[[4L]],")!\n"))
    }
});
```

You can also use a previously created function:

```r
myCallback <- function(selection){
    if(is.null(selection)){
        cat("Selection: nothing is selected!\n")
    }
    else {
        cat(paste0("Selection: from (",selection[[1L]],",",selection[[2L]],") to (",selection[[3L]],",",selection[[4L]],")!\n"))
    }
}

Handsontable.on('main', 'onDidChangeSelection', myCallback);
```

### onDidChangeSelection

Called when the user changed the current selection in the table. The callback
only have one parameter, `selection`, which is `NULL` if nothing is selected.
Otherwise, it's a vector of 4 values:

- The first value is the index of the starting row;
- The second value is the index of the starting column;
- The third value is the index of the ending row;
- The last value is the index of the ending column.

### onDidChangeValue

Called when the user changes the value of the table. The callback must have 3
parameters:

- `columns`: the column names;
- `rows`: the row names;
- `value`: the data frame.

### onDidLoad

`onDidLoad` is called when the grid finished its initialization, and is ready to
be updated or modified. There is no argument to `onDidLoad`.
