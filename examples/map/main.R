setDefaultView <- function(){
    rpgm.sendToJavascript('resetView', list()); # resetView doesn't not need data, so we use an empty list
}

doDisplayPolygon <- function(Z, view)
{
    Z_range <- list(lng = range(Z[, 1]), lat = range(Z[, 2]))
    return(Z_range$lat[1] < view$northLat && Z_range$lat[2] > view$southLat && Z_range$lng[1] < view$eastLng && Z_range$lng[2] > view$westLng)
}

formatPolygonForLeaflet <- function(Z)
    return(lapply(seq_len(nrow(Z)), function(k) list(Z[k, 1], Z[k, 2])))


leafletTooltipGeo <- function(pays, region, dpt, canton, insee, commune)
    return(paste0(
        "Pays : <strong>", pays, "</strong>",
        `if`(is.null(region), "", paste0("<br>Région : <strong>", region, "</strong>")),
        `if`(is.null(dpt), "", paste0("<br>Département : <strong>", dpt, "</strong>")),
        `if`(is.null(canton), "", paste0("<br>Canton : <strong>", canton, "</strong>")),
        `if`(is.null(insee), "", paste0("<br>Insee : <strong>", insee, "</strong>")),
        `if`(is.null(commune), "", paste0("<br>Commune : <strong>", commune, "</strong>"))
    ))


leafletTooltipDonnees <- function(pays, region, dpt, canton, insee, commune, donnees)
{
    tooltip <- leafletTooltipGeo(pays, region, dpt, canton, insee, commune)
    for(i in 1:length(donnees))
        tooltip <- paste0(tooltip, `if`(i == 1, "<br>", ""), "<br>", names(donnees)[i], " : <strong>", format(round(donnees[[i]]$value), big.mark = " "), donnees[[i]]$unit, "</strong>.")
    return(tooltip)
}

plotlyTitle <- function(pays, region, dpt, canton, insee, commune, primes)
    return(paste0(
        "<b>", pays, "</b>",
        `if`(is.null(region), "", paste0(", <b>", region, "</b>")),
        `if`(is.null(dpt), "", paste0(", <b>", dpt, "</b>")),
        `if`(is.null(canton), "", paste0(", <b>", canton, "</b>")),
        `if`(is.null(insee), "", paste0(", <b>", insee, "</b>")),
        `if`(is.null(commune), "", paste0(", <b>", commune, "</b>")),
        `if`(is.null(primes), "", paste0("<br>Primes : <b>", format(round(primes), big.mark = " "), "€</b>"))
    ))

plotly_graph <- function(data)
{
        z <- getLvlPolygonToDisplay(data$zoomLevel)
        selected_shape <- shape[[z]][data$id, ]
        assures <- Donnees[["Primes"]][t(sf::st_contains(selected_shape, donnees_points_sf, sparse = FALSE)), ]

        #layout commun
        layout = list(
            title = plotlyTitle(selected_shape$COUNTRY, selected_shape$NAME_1, selected_shape$NAME_2, selected_shape$NAME_3, selected_shape$NAME_4, selected_shape$NAME_5, DonneesCartes[["Primes"]]$valeurs[[z]][as.integer(data$id)]),
            font = list(
                color = '#ecf0f1'
            ),
            plot_bgcolor = '#2e3134',
            paper_bgcolor = '#2e3134'
        )

        #graphiques 
        for(var in paste0("var_", 1:3))
        {
            donnees_plotly <- table(assures[[var]])
            data_plotly = list(
                values= as.list(as.vector(donnees_plotly)),
                labels= as.list(names(donnees_plotly)),
                type= 'pie',
                marker = list(
                    colors = c('#3498db', '#c0392b')
                )
            )
            gui.setValue('this', var, list(data = data_plotly, layout = layout))
            gui.show('this', var)
        }
}

rpgm.on('didReceiveMessage', function(message, data){
    if(message == 'mapState'){
        z <<- getLvlPolygonToDisplay(data$view$zoomLevel)
        if(mapReady[[empreinte]] >= z && (is.null(lastView) || lastView$empreinte != empreinte || lastView$zoomLevel != data$view$zoomLevel || (data$view$northLat > lastView$northLat || data$view$southLat < lastView$southLat || data$view$eastLng > lastView$eastLng || data$view$westLng < lastView$westLng)))
        {
            total <- 0

            lengthLat <- data$view$northLat - data$view$southLat
            lengthLng <- data$view$eastLng - data$view$westLng
            data$view[c('northLat', 'southLat', 'eastLng', 'westLng')] <- as.list(c(data$view$northLat, data$view$southLat, data$view$eastLng, data$view$westLng) + 0.4*c(lengthLat, - lengthLat, lengthLng, - lengthLng))

            lastView <<- data$view[c('northLat', 'southLat', 'eastLng', 'westLng', 'zoomLevel')]
            lastView$empreinte <<- empreinte

            for(i in 1:length(shape[[z]]$geometry))
            {
                P <- list()
                l <- 1
                for(j in 1:length(shape[[z]]$geometry[[i]]))
                {
                    for(k in 1:length(shape[[z]]$geometry[[i]][[j]]))
                    {
                        Z <- shape[[z]]$geometry[[i]][[j]][[k]]
                        if(nrow(Z) > 1 && doDisplayPolygon(Z, data$view))
                        {
                            P[[l]] <- formatPolygonForLeaflet(Z)
                            l <- l+1
                        }
                    }
                }
                if(l > 1)
                {
                    if(empreinte == "Primes")
                        rpgm.sendToJavascript('addGeoJSON', list(points=P, id=i, tooltip=leafletTooltipDonnees(shape[[z]]$COUNTRY[i], shape[[z]]$NAME_1[i], shape[[z]]$NAME_2[i], shape[[z]]$NAME_3[i], shape[[z]]$NAME_4[i], shape[[z]]$NAME_5[i], list(Primes = list(value = DonneesCartes[[empreinte]]$valeurs[[z]][i], unit = DonneesCartes[[empreinte]]$unite))), color=DonneesCartes[[empreinte]]$couleurs[[z]][i]))
                    else if(empreinte == "Ciaran")
                        rpgm.sendToJavascript('addGeoJSON', list(points=P, id=i, tooltip=leafletTooltipDonnees(shape[[z]]$COUNTRY[i], shape[[z]]$NAME_1[i], shape[[z]]$NAME_2[i], shape[[z]]$NAME_3[i], shape[[z]]$NAME_4[i], shape[[z]]$NAME_5[i], list(Primes = list(value = DonneesCartes[["Primes"]]$valeurs[[z]][i], unit = "€"), Vents = list(value = DonneesCartes[[empreinte]]$valeurs[[z]][i], unit = DonneesCartes[[empreinte]]$unite))), color=DonneesCartes[[empreinte]]$couleurs[[z]][i]))
                    total <- total+1
                }
            }
            
            # Erase previous drawings and draw all polygons addded in queue
            rpgm.sendToJavascript('drawGeoJSON', list());
                rpgm.sendToJavascript('updateLegend', list(content=
                    getLegend(lapply(seq_len(length(DonneesCartes[[empreinte]]$legendes[[z]]$couleurs)), function(k) list(color = DonneesCartes[[empreinte]]$legendes[[z]]$couleurs[k], label = DonneesCartes[[empreinte]]$legendes[[z]]$labels[k])), DonneesCartes[[empreinte]]$unite
                )))
            # Markers
            if(empreinte == "Primes")
                donnees_loc <- Donnees[[empreinte]][Donnees[[empreinte]]$lat < data$view$northLat & Donnees[[empreinte]]$lat > data$view$southLat & Donnees[[empreinte]]$lng < data$view$eastLng & Donnees[[empreinte]]$lng > data$view$westLng, ]
            if(empreinte == "Primes" && nrow(donnees_loc) <= 500L)
            {
                if(empreinte == "Primes")
                    D <- lapply(seq_len(nrow(donnees_loc)), function(k) list(lat = donnees_loc$lat[k], lng = donnees_loc$lng[k], label = paste0(empreinte, " : <strong>", donnees_loc$prime_ttc[k], DonneesCartes[[empreinte]]$unite, "</strong>.")))
                else if(empreinte == "Ciaran")
                    D <- lapply(seq_len(nrow(donnees_loc)), function(k) list(lat = donnees_loc$lat[k], lng = donnees_loc$lng[k], label = paste0(empreinte, " : <strong>", donnees_loc$rafales[k], DonneesCartes[[empreinte]]$unite, "</strong>.")))
                rpgm.sendToJavascript('updateMarkers', list(markers = D))
            }
            else
            {
                rpgm.sendToJavascript('updateMarkers', list(markers = list()))
            }
        }
    }
    else if(message == 'mapClick'){
        #print(paste0('User clicked on lat: ',data$coordinates$lat, 'and lng: ', data$coordinates$lng));
    }
    else if(message == 'zoneClick'){
        plotly_graph(data)
   }
   else if(message == 'loadDonneesContinue'){
        loadDonnees(data$empreinte, path[[data$empreinte]], data$lastShapeContinue)
   }
});

getLegend <- function(info, unite)
{
    result <- paste0('Légende (', unite, ') <br>');
    for(i in info)
        result <- paste0(result, '<i style="background:', i$color, '"></i> ', i$label, '<br>')

    return(result);
}