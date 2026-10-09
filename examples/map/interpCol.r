#Functions which give a vector or matrix of colors according to a level (doc in french)

#Fonction permettant, depuis un vecteur de données, de récupérer les couleurs en un dégradé proportionnel partant de col1 allant à col2.
#Les couleurs sont à entrer sous la forme "red" ou en hexadécimal de la forme "#FFFFFF".
#@param X Vecteur dont les couleurs seront proportionnelles
#@param col1 Première couleur limite
#@param col2 Deuxième couleur limite
interpCol <- function(X, col1 = "black", col2 = "white")
{
  #Récupération des couleurs en vecteur RGB donc les composantes vont de 0 à 255
  c1 <- as.vector(col2rgb(col1));
  c2 <- as.vector(col2rgb(col2));
  Xmin <- min(X);
  Xmax <- max(X);
  #Coefficient de la proportion d'écart entre le min et le max, i.e. qu'il faudra mettre entre c1 et c2
  a <- (X - Xmin)/(Xmax - Xmin);
  #On normalise à 1 car la fonction RGB prend curieusement des réels entre 0 et 1 (et non des entiers entre 0 et 255)
  return(rgb((c1[1] + a*(c2[1] - c1[1]))/255, (c1[2] + a*(c2[2] - c1[2]))/255, (c1[3] + a*(c2[3] - c1[3]))/255)) 
}

#Fonction permettant, depuis un vecteur de données, de récupérer les couleurs en un dégradé proportionnel partant de col[1] allant à col[2], ..., puis de col[length(col)-1] à col[length(col)], avec des proportions choisies dans step, qui vont de 0 à 1.
#Les couleurs sont à entrer sous la forme "red" ou en hexadécimal de la forme "#FFFFFF".
#@param X Vecteur dont les couleurs seront proportionnelles
#@param col Vecteur de couleurs pour la proportionnalité
#@param step Vecteur des palliers de couleur entre 0 et 1
interpCol2 <- function(X, col = c("black", "white"), step = NA)
{
  #Cas équivalent interpCol
  if(length(col) == 2L)
    return(interpCol(X, col[1L], col[2L]));
  
  #Vérification de la cohérence de step et cas par défaut
  if(any(is.na(step)))
    step <- (1L:(length(col)-1L))/length(col)
  else
    if(!(length(step) == length(col)-2L || length(step) == length(col) && step[1L] == 0 && step[length(step)] == 1))
      stop("The variable step is not suitable.")
    else if(length(step) == length(col))
      step <- step[c(-1L, -length(step))]

  #Calcul des couleurs
  Y <- X
  c1 <- as.vector(col2rgb(col[1L]))
  Xmin <- min(X)
  Xlim <- Xmin + step*(max(X) - Xmin)
  for(i in 1L:length(step))
  {
    c2 <- as.vector(col2rgb(col[i + 1L]))
    Xmax <- Xlim[i];
    indices <- Xmin  <= X & X <=  Xmax
    a <- (X[indices] - Xmin)/(Xmax - Xmin)
    Y[indices] <- rgb((c1[1L] + a*(c2[1L] - c1[1L]))/255, (c1[2L] + a*(c2[2L] - c1[2L]))/255, (c1[3L] + a*(c2[3L] - c1[3L]))/255)
    Xmin <- Xmax
    c1 <- c2
  }
  c2 <- as.vector(col2rgb(col[length(col)]))
  Xmax <- max(X);
  indices <- Xmin <= X & X <= Xmax
  a <- (X[indices] - Xmin)/(Xmax - Xmin)
  Y[indices] <- rgb((c1[1L] + a*(c2[1L] - c1[1L]))/255, (c1[2L] + a*(c2[2L] - c1[2L]))/255, (c1[3L] + a*(c2[3L] - c1[3L]))/255)
  return(Y)
}

###Exemple 2D
#x <- seq(-3,3, 0.01)
#y <- dnorm(x)
#plot(x, y, pch = 16, col = interpCol2(y, c("blue", "green", "purple", "black"), step = c(0.1, 0.9)))

#Equivalent (les borndes 0 et 1 sont facultatives)
#plot(x, y, pch = 16, col = interpCol2(y, c("blue", "green", "purple", "black"), step = c(0, 0.1, 0.9, 1)))
