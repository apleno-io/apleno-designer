# Excel files (R only)

> Source: Apleno documentation (api/r-python/xlsx.md). Windows and R only.


These functions can open and edit an Excel XLSX file. Do not forget to call
[xlsx.open()]() on a file before editing or reading a document.
Also, do not forget to select the current worksheet with
[xlsx.selectWorksheet()]() to make sure that all other
functions are executed on the correct sheet. The modification will be saved only
after the call to [xlsx.saveAs()]().

!!! note

    Please note that all XLSX functions are currently **only available on
    Windows** and for **R** language.

## Complete Example

```r
# Open the XLSX
xlsx.open(rpgm.pgmFilePath("template.xlsx"));

# Cells management
xlsx.clearCells("A2", "B4");
xlsx.mergeCells("A6", "B6");
xlsx.unmergeCells("A2", "B2");
test1 <- xlsx.getCells("C4");
test2 <- xlsx.getCells("D5:H6");
test3 <- xlsx.getCells("D5:H6", asNumber = FALSE);
xlsx.setCell("A1", "A string to put in the A1 cell");
xlsx.setName("cellnametest", 12.56);

# Document info
xlsx.setTitle("New excel title");
xlsx.setAuthor("John Doe");
xlsx.setDescription("This is a description");

# Columns & Rows
xlsx.removeRows(13, 2);
xlsx.removeColumns("M", 3);
xlsx.copyRows(4, 5, 9);
xlsx.copyColumns("G", "H", "J");
xlsx.addRows(3, 2);
xlsx.addColumns("E", 2)

# Worksheets
xlsx.addWorksheet("New worksheet");
xlsx.copyWorksheet("New worksheet", "Copy");
xlsx.moveWorksheet("Copy", 0);
xlsx.renameWorksheet("Copy", "First Worksheet");
xlsx.selectWorksheet("First Worksheet");

# Images
xlsx.insertImage(rpgm.pgmFilePath("logo.png"), "I18");

# Save
xlsx.saveAs("result.xlsx");
```

## Functions

### `xlsx.addColumns(origin, number)`

Adds a `number` of columns after the `origin` column. `origin` is a string
representing a column (Example: _A_, _DF_).

### `xlsx.addRows(origin, number)`

Adds a `number` of rows after the `origin` row. `origin` is a number.

### `xlsx.addWorksheet(name)`

Creates a new worksheet in the Excel spreadsheet named `name`.

### `xlsx.clearCells(start, end)`

Clears the content of the cells from `start` to `end`.

### `xlsx.copyColumns(start, end, target)`

Copies all columns from `start` to `end` to the position `target`.

- `start`, `end` and `target` are strings representing the columns (like _A_ or
  _DF_).
- For copying a single column, `start` and `end` must have the same value.

### `xlsx.copyRows(start, end, number)`

Copies all rows from `start` to `end` to the position `number`.

- `start`, `end` and `number` are numbers representing the row.
- For copying a single row, `start` and `end` must have the same value.

### `xlsx.copyWorksheet(origin, target)`

Duplicates an existing worksheet named `origin` to a new worksheet named
`target`.

### `xlsx.getCells(cells, asNumber = TRUE)`

Retrieves values in the `cells` from the opened spreadsheet.

- `cells` can be a single cell like _B3_ or a range like _C4:F9_
- `asNumber` will return a matrix of numbers if set to `TRUE`. Set to `FALSE`
  for returning a matrix of strings.

!!! note

    This function only returns the values of the ORIGINAL document. Opening
    an Excel file, setting a custom value in a cell and then getting the same cell's
    value will return the original value, not the one which was set afterwards.

!!! warning

    This function is pretty slow to execute. Try to minimise the calls
    to this function. Prefer calling `getCell()` once with a bigger range value
    (even if some cells in the range are empty or not needed) rather than calling
    `getCell()` multiple times.

### `xlsx.insertImage(path, cell)`

Inserts an image at the cell `cell`. `path` is the path to the image.

### `xlsx.mergeCells(start, end)`

Merges the cells from `start` to `end` to a single cell.

### `xlsx.moveWorksheet(origin, position)`

Moves the worksheet named `origin` to a new `position`.

- `position` is a number. The first worksheet is at position 0. The second at 1,
  and so on.

### `xlsx.open(filename)`

Opens the `filename` Excel spreadsheet file for editing.

!!! warning

    This function MUST be called before any other XLSX functions, as
    other functions will be executed on the last Excel spreadsheet opened.

### `xlsx.removeColumns(origin, number)`

Deletes `number` columns from `origin`.

### `xlsx.removeRows(origin, number)`

Deletes `number` rows from `origin`.

### `xlsx.removeWorksheet(target)`

Deletes a worksheet named `target`.

### `xlsx.renameWorksheet(oldname, newname)`

Renames an existing worksheet named `oldname` to `newname`.

### `xlsx.saveAs(outputfile)`

Saves all the modifications made to a new file `outputfile`.

### `xlsx.selectWorksheet(target)`

Selects a worksheet for other functions.

### `xlsx.setAuthor(author = Sys.info()[["user"]])`

Sets the Author property of the Excel spreadsheet to `author`. By default the
value will be `Sys.info()[["user"]]` which is the name of the user currently
connected in the Operating System of the computer.

### `xlsx.setCell(cell, value)`

Sets the cell `cell` to the value `value`.

### `xlsx.setDescription(desc)`

Sets the description property to `desc` of the Excel spreadsheet.

### `xlsx.setName(name, value)`

Sets the cell named `name` to the value `value`.

### `xlsx.setTitle(title)`

Sets the title property of the Excel spreadsheet to `title`.

### `xlsx.unmergeCells(start, end)`

Unmerges the cells from `start` to `end`.
