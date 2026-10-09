file.copy(rpgm.pgmFilePath('leaflet/icon.png'), rpgm.outputFile("icon.png"));

shape <- list()
n_shape <- 6L
script.setProgress(TRUE, 0L, "Importing shape files... 1/6")

#shape$country <- sf::st_read("sf/gadm41_FRA_0.shp")
#shape$country <- sf::st_simplify(shape$country, preserveTopology = TRUE, dTolerance = 600)
#sf::st_write(shape$country, "sf-simple/FRA-0.shp", crs = sf::st_crs(shape$country))
shape$country <- sf::st_read("sf-simple/FRA-0.shp")
script.setProgress(TRUE, 17L, "Importing shape files... 2/6")

#shape$region <- sf::st_read("sf/gadm41_FRA_1.shp")
#shape$region <- sf::st_simplify(shape$region, preserveTopology = TRUE, dTolerance = 150)
#sf::st_write(shape$region, "sf-simple/FRA-1.shp", crs = sf::st_crs(shape$region))
shape$region <- sf::st_read("sf-simple/FRA-1.shp")
script.setProgress(TRUE, 33L, "Importing shape files... 3/6")

#shape$departement <- sf::st_read("sf/gadm41_FRA_2.shp")
#shape$departement <- sf::st_simplify(shape$departement, preserveTopology = TRUE, dTolerance = 80)
#sf::st_write(shape$departement, "sf-simple/FRA-2.shp", crs = sf::st_crs(shape$departement))
shape$departement <- sf::st_read("sf-simple/FRA-2.shp")
script.setProgress(TRUE, 50L, "Importing shape files... 4/6")

#shape$canton <- sf::st_read("sf/gadm41_FRA_3.shp")
#shape$canton <- sf::st_simplify(shape$canton, preserveTopology = TRUE, dTolerance = 40)
#sf::st_write(shape$canton, "sf-simple/FRA-3.shp", crs = sf::st_crs(shape$canton))
shape$canton <- sf::st_read("sf-simple/FRA-3.shp")
script.setProgress(TRUE, 67L, "Importing shape files... 5/6")

#shape$insee <- sf::st_read("sf/gadm41_FRA_4.shp")
#shape$insee <- sf::st_simplify(shape$insee, preserveTopology = TRUE, dTolerance = 20)
#sf::st_write(shape$insee, "sf-simple/FRA-4.shp", crs = sf::st_crs(shape$insee), layer_options = "ENCODING=UTF-8")
shape$insee <- sf::st_read("sf-simple/FRA-4.shp")
script.setProgress(TRUE, 83L, "Importing shape files... 6/6")

#shape$commune <- sf::st_read("sf/gadm41_FRA_5.shp")
#shape$commune <- sf::st_simplify(shape$commune, preserveTopology = TRUE, dTolerance = 10)
#sf::st_write(shape$commune, "sf-simple/FRA-5.shp", crs = sf::st_crs(shape$commune), layer_options = "ENCODING=UTF-8")
shape$commune <- sf::st_read("sf-simple/FRA-5.shp")
script.setProgress(TRUE, 100L, "Importing shape files... 6/6")

getLvlPolygonToDisplay <- function(zoomLevel)
{
    if(zoomLevel <=5L)
        return(1L)
    if(zoomLevel <=6L)
        return(2L)
    if(zoomLevel <=7)
        return(3L)
    if(zoomLevel <=8L)
        return(4L)
    if(zoomLevel <=9L)
        return(5L)
    return(6L)
}

z <- getLvlPolygonToDisplay(5L)

couleur_min <- '#f1c40f'
couleur_max <- '#c0392b'
couleur_median <- '#e67e22'
couleur_zero <- '#bdc3c7'

Donnees <- list()
DonneesCartes <- list()
loadDonneesPrimes <- function(path, continue = 1L)
{
    #Premier passage
    if(is.null(DonneesCartes[["Primes"]]))
    {
        DonneesCartes[["Primes"]] <<- list(
            valeurs = list(),
            couleurs = list(),
            legendes = list(),
            unite = "€"
        )
    }

    if(continue == 1L)
    {
        gui.show(rpgm.step('main', 'leaflet'), 'progressbar_donnees')
        gui.setProperties("this", "progressbar_donnees", list(value = 0, progressdescription = "0%"))
        Donnees[["Primes"]] <<- data.table::fread(path, sep =";", na.strings=c("",NA,"NULL"), select=c("lat", "lng", "prime_ttc", "var_1", "var_2", "var_3"), encoding = 'UTF-8')
        IS_NULL <- is.na(Donnees[["Primes"]]$lat) | is.na(Donnees[["Primes"]]$lng)

        Donnees[["Primes"]] <<- Donnees[["Primes"]][!IS_NULL, ]

        data.table::setDF(Donnees[["Primes"]])

        donnees_points <- Donnees[["Primes"]][c("lat", "lng")]
        donnees_points_sf <<- sf::st_as_sf(donnees_points, coords = c('lng', 'lat'), crs = sf::st_crs(shape[[1]]))
    }

    #Chargement par niveau, reprise si continue > 2L et que ce n'est pas terminé
    if(continue <= 6L)
        for(i in continue:length(shape))
        {
            Z <- as.data.frame(sf::st_within(donnees_points_sf, shape[[i]])) #dans le polygone ou non, tester si plus performant
            DonneesCartes[["Primes"]]$valeurs[[i]] <<- as.vector(tapply(Donnees[["Primes"]]$prime_ttc[Z$row.id], factor(Z$col.id, levels = 1:length(shape[[i]]$geometry)), sum))
            DonneesCartes[["Primes"]]$valeurs[[i]][is.na(DonneesCartes[["Primes"]]$valeurs[[i]])] <<- 0
            if(length(DonneesCartes[["Primes"]]$valeurs[[i]]) > 1)
            {
                DonneesCartes[["Primes"]]$couleurs[[i]] <<- interpCol(DonneesCartes[["Primes"]]$valeurs[[i]], couleur_min, couleur_max)
                plage_legende <- min(DonneesCartes[["Primes"]]$valeurs[[i]]) + c(1, 0.65, 0.35, 0.05)*(max(DonneesCartes[["Primes"]]$valeurs[[i]]) - min(DonneesCartes[["Primes"]]$valeurs[[i]]))
                DonneesCartes[["Primes"]]$legendes[[i]] <<- list(couleurs = c(interpCol(plage_legende, couleur_min, couleur_max), couleur_zero), labels = format(c(round(plage_legende), 0), big.mark = " "))
            }
            else
            {
                DonneesCartes[["Primes"]]$couleurs[[i]] <<- couleur_median
                DonneesCartes[["Primes"]]$legendes[[i]] <<- list(couleurs = couleur_median, labels = format(round(DonneesCartes[["Primes"]]$valeurs[[i]][1]), big.mark = " "))
            }
            DonneesCartes[["Primes"]]$couleurs[[i]][DonneesCartes[["Primes"]]$valeurs[[i]] == 0] <<- couleur_zero
            k <- round(100*i/(n_shape))
            gui.setProperties("this", "progressbar_donnees", list(value = k, progressdescription = `if`(k < 25, paste0(k, "%"), paste0("Import... ", k, "%"))))
            if(z <= i)
            {
                mapReady$Primes <<- i
                rpgm.sendToJavascript('updateMap', list(empreinte = "Primes", lastShapeContinue = i+1L))
                return(NULL)
            }
        }
    mapReady$Primes <<- 6L
    gui.hide("this", 'progressbar_donnees')
}

loadDonneesVents <- function(path, continue = 1L)
{

    if(is.null(DonneesCartes[["Ciaran"]]))
    {
        DonneesCartes[["Ciaran"]] <<- list(
            valeurs = list(),
            couleurs = list(),
            legendes = list(),
            unite = "km/h"
        )
    }

    if(continue == 1L)
    {
        gui.show(rpgm.step('main', 'leaflet'), 'progressbar_donnees')
        gui.setProperties("this", "progressbar_donnees", list(value = 0, progressdescription = "0%"))
        Donnees[["Ciaran"]] <<- data.table::fread(path, sep =";", na.strings=c("",NA,"NULL"), select=c("Coordonnees", "Rafale sur les 10 dernieres minutes"))
        colnames(Donnees[["Ciaran"]]) <<- c("coord", "rafales")
        Donnees[["Ciaran"]] <<- Donnees[["Ciaran"]][!is.na(Donnees[["Ciaran"]]$coord) & !is.na(Donnees[["Ciaran"]]$rafales)]
        max_rafales <- tapply(Donnees[["Ciaran"]]$rafales, Donnees[["Ciaran"]]$coord, max)
        Donnees[["Ciaran"]] <<- data.frame(coord = names(max_rafales), rafales = as.vector(max_rafales))
        colnames(Donnees[["Ciaran"]]) <<- c("coord", "rafales")
        Donnees[["Ciaran"]][, c("lat", "lng")] <<- data.table::tstrsplit(Donnees[["Ciaran"]]$coord, ", ")
        Donnees[["Ciaran"]]$lat <<- as.numeric(Donnees[["Ciaran"]]$lat)
        Donnees[["Ciaran"]]$lng <<- as.numeric(Donnees[["Ciaran"]]$lng)
        Donnees[["Ciaran"]]$coord <<- NULL
        Donnees[["Ciaran"]]$rafales <<- Donnees[["Ciaran"]]$rafales*3.6

        vents_points <- Donnees[["Ciaran"]][c("lat", "lng")]
        vents_points_sf <<- sf::st_as_sf(vents_points, coords = c('lng', 'lat'), crs = sf::st_crs(shape[[1]]))
    }

    if(continue <= 6L)
        for(i in continue:length(shape))
        {
            Z <- as.data.frame(sf::st_within(vents_points_sf, shape[[i]])) #dans le polygone ou non, tester si plus performant
            DonneesCartes[["Ciaran"]]$valeurs[[i]] <<- as.vector(tapply(Donnees[["Ciaran"]]$rafales[Z$row.id], factor(Z$col.id, levels = 1:length(shape[[i]]$geometry)), max))
    #        DonneesCartes[["Ciaran"]]$valeurs[[i]][is.na(DonneesCartes[["Ciaran"]]$valeurs[[i]])] <<- 0
            #Interpolation en cas d'absence de mesure
            I <- is.na(DonneesCartes[["Ciaran"]]$valeurs[[i]])
            a <- sf::st_centroid(shape[[i]]$geometry[I])
            w <- 1/(sf::st_distance(vents_points_sf, a)^2)
            DonneesCartes[["Ciaran"]]$valeurs[[i]][I] <<- colSums(w*Donnees[["Ciaran"]]$rafales)/colSums(w)

            if(length(DonneesCartes[["Ciaran"]]$valeurs[[i]]) > 1)
            {
                DonneesCartes[["Ciaran"]]$couleurs[[i]] <<- interpCol2(DonneesCartes[["Ciaran"]]$valeurs[[i]], c("#acd0f1", "#3498db", "#2980b9", "#1c2e30"), c(0, 0.25, 0.5, 1))
                plage_legende <- min(DonneesCartes[["Ciaran"]]$valeurs[[i]]) + c(1, 0.5, 0.25, 0)*(max(DonneesCartes[["Ciaran"]]$valeurs[[i]]) - min(DonneesCartes[["Ciaran"]]$valeurs[[i]]))
                DonneesCartes[["Ciaran"]]$legendes[[i]] <<- list(couleurs = c(interpCol2(plage_legende, c("#acd0f1", "#3498db", "#2980b9", "#1c2e30"), c(0, 0.25, 0.5, 1))), labels = format(c(round(plage_legende)), big.mark = " "))
            }
            else
            {
                DonneesCartes[["Ciaran"]]$couleurs[[i]] <<- "#1c2e30"
                DonneesCartes[["Ciaran"]]$legendes[[i]] <<- list(couleurs = "#1c2e30", labels = format(round(DonneesCartes[["Ciaran"]]$valeurs[[i]][1]), big.mark = " "))
            }
            #DonneesCarte_couleurs[["Ciaran"]][[i]][DonneesCarte[["Ciaran"]][[i]] == 0] <<- couleur_zero
            k <- round(100*i/(n_shape))
            gui.setProperties("this", "progressbar_donnees", list(value = k, progressdescription = `if`(k < 25, paste0(k, "%"), paste0("Import... ", k, "%"))))
            if(z <= i)
            {
                mapReady$Ciaran <<- i
                rpgm.sendToJavascript('updateMap', list(empreinte = "Ciaran", lastShapeContinue = i+1L))
                return(NULL)
            }
        }
    mapReady$Ciaran <<- 6L
    gui.hide("this", 'progressbar_donnees')
}

loadDonnees <- function(nom, path, continue = 1L)
{
    if(nom == "Primes")
        if(is.null(DonneesCartes[[nom]]) || mapReady[[nom]] < 6L)
        {
            gui.setProperty("this", "loadRepeater", "intervalcode" ,"")
            loadDonneesPrimes(path, continue)
        }
        else
            gui.hide("this", 'progressbar_donnees')
    if(nom == "Ciaran")
        if(is.null(DonneesCartes[[nom]]) || mapReady[[nom]] < 6L)
        {
            loadDonneesVents(path, continue)
        }
        else
            gui.hide("this", 'progressbar_donnees')
}

path <- list(Primes = "donnees/aportfolios.csv", Ciaran = "donnees/synop.csv")
empreinte <- "Primes"
mapReady <- list(Primes = 0L, Ciaran = 0L)
lastView <- NULL
gui.hide(rpgm.step('main', 'leaflet'), 'var_1')
gui.hide(rpgm.step('main', 'leaflet'), 'var_2')
gui.hide(rpgm.step('main', 'leaflet'), 'var_3')
gui.hide(rpgm.step('main', 'leaflet'), 'progressbar_donnees')
