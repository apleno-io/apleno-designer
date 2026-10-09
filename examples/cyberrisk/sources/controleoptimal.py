# Condition terminale

def ControleOptimal(eta, Alpha, V, ePY, idprogress = None):
    V[nt, :] = -1.
    for i in reversed(range(nt)):
        if idprogress is not None and int(i) % int(nt/100) == 0:
            gui.setValue("this", idprogress, int((1-i/nt)*100))
        for j in range(nl+1):
            dV_lambda = (V[i+1, j] - V[i+1, np.maximum(j-1, 0)])/dlambda
            I_v = ePY*V[i+1, np.minimum(j+j_delta, nl)]-V[i+1, j]
            Alpha[i, j] = max(0, (-1 + np.sqrt((gamma*E_Lambda[j] * I_v)/(eta*V[i+1, j])))/gamma)
            if(Alpha[i, j] == 0):
                V[i, j] = V[i+1, j] + dt*(
                    (-c*eta + 0.5*eta**2*sigma**2 - eta/gamma)*V[i+1, j]
                    - beta*(E_Lambda[j] - mu)*dV_lambda
                    - 2*np.sqrt(gamma*E_Lambda[j]*eta*V[i+1, j]*I_v)-eta*V[i+1, j]/gamma
                )
            else:
                V[i, j] = V[i+1, j] + dt*(
                    (-c*eta + 0.5*eta**2*sigma**2 - eta/gamma)*V[i+1, j]
                    - beta*(E_Lambda[j] - mu)*dV_lambda
                    + E_Lambda[j]*I_v
                )
    return Alpha, V

