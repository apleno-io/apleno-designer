import numpy as np

#eta = 0.1
#mu, s2, beta, xi, rho = 0.07, 0.04, 2., 0.25, -0.7

def oc_mc(eta, mu, s2, beta, xi, rho):
    gui.disable('this', 'oc_calcul')
    gui.setValue('this', 'oc_calcul', 'Calcul <i class="fa-solid fa-cog fa-spin"></i>')
 
    T, minsV, maxsV = 1., 0.01, 0.51
    dt, dv = 0.004, 0.005
    mT, msV = np.arange(0., T+dt, dt), np.arange(minsV, maxsV+dv, dv)
    nt, nv = mT.size-1, msV.size-1

    # Précalcul de constances récurrentes dans les boucles
    srho2, sdt, minV, maxV, mV = np.sqrt(1-rho*rho), np.sqrt(dt), minsV*minsV, maxsV*maxsV, msV*msV

    # V = V[t, ・], V_next = V[t+dt, ・]
    V, V_next = np.empty(nv+1), np.full(nv+1, -1.)

    # Contrôles espace, plus précis pour les petites valeurs ici
    A = np.concatenate([
    np.linspace(0., 50., 50, endpoint=False),
    np.linspace(50., 100., 25, endpoint=False),
    np.linspace(100., 200., 21)])
    # Contrôle sauvegarde
    alpha = np.empty([nt, nv+1])

    # nombre de simulations MC
    n = 375

    for j in reversed(range(nt)):
        gui.setValue('this', 'oc_progress', int(100*(nt-j+1)/nt))
        for k in range(nv+1):
            V[k] = np.finfo(np.float64).min
            dW1 = np.random.normal(0., sdt, n)
            dW3 = rho*dW1 + srho2*np.random.normal(0., sdt, n)
            pV = mV[k] - beta*(mV[k] - s2)*dt + xi*msV[k]*np.concatenate([dW3, -dW3])
            spV = np.sqrt(np.clip(pV, minV, maxV))
            #Calcul des indices d'où tombe pV
            i_pV_float = (spV - minsV)/dv
            p_interpol_sup, i_pv_inf = np.modf(i_pV_float)
            i_pv_inf = i_pv_inf.astype(np.int32)
            i_pv_sup = np.minimum(i_pv_inf + 1, nv) #l'indice peut atteindre nv+1 sinon, avec un poids de 0, mais génère une erreur
            pX_1 = mu*dt + msV[k]*np.concatenate([dW1, -dW1])
            for a in A:
                V_a = np.mean(np.exp(-eta*a*pX_1)*((1. - p_interpol_sup)*V_next[i_pv_inf] + p_interpol_sup*V_next[i_pv_sup]))
                if V_a > V[k]:
                    V[k] = V_a
                    alpha[j, k] = a
        V_inter = V #Echange des références
        V = V_next
        V_next = V_inter
    gui.setValue('this', 'oc_progress', 100)
    gui.hide('this', 'waiting')
    rpgm.notification('info', 'Calcul contrôle optimal terminé 💡<br>Résultats ci-dessous (descendre 👇)')
    gui.enable('this', 'oc_calcul')
    gui.setValue('this', 'oc_calcul', 'Calculer 👇')
    return alpha
