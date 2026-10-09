import numpy as np

#eta = 0.1
#mu, s2, beta, xi, rho = 0.07, 0.04, 2., 0.25, -0.7

def oc_edp(eta, mu, s2, beta, xi, rho):
    gui.disable('this', 'oc_calcul')
    gui.setValue('this', 'oc_calcul', 'Calcul <i class="fa-solid fa-cog fa-spin"></i>')
    if eta is None:
        eta = 0.1
    if mu is None:
        mu = 0.07
    if s2 is None:
        s2 = 0.04
    if beta is None:
        beta = 2.
    if xi is None:
        xi = 0.25
    if rho is None:
        rho = -0.7

    T, minsV, maxsV = 1., 0.01, 0.51
    dt, dv = 0.0002, 0.005
    mT, msV = np.arange(0., T+dt, dt), np.arange(minsV, maxsV+dv, dv)
    nt, nv = mT.size-1, msV.size-1

    # Précalcul de constances récurrentes dans les boucles
    srho2, sdt, dv2, minV, maxV, mV, xi2 = np.sqrt(1-rho*rho), np.sqrt(dt), dv*dv, minsV*minsV, maxsV*maxsV, msV*msV, xi**2

    # V = V[t, ・], V_next = V[t+dt, ・]
    V, V_next = np.empty(nv+1), np.full(nv+1, -1.)

    # Contrôle sauvegarde
    alpha = np.empty([nt, nv+1])

    for j in reversed(range(nt)):
        gui.setValue('this', 'oc_progress', int(100*(nt-j+1)/nt))
        for k in range(nv+1):
            dphi_v = (mV[k] < s2)*(V_next[np.minimum(k+1, nv)] - V_next[k])/dv + (mV[k] >= s2)*(V_next[k] - V_next[np.maximum(k-1, 0)])/dv
            dphi_vv = (V_next[np.minimum(k+1, nv)] - 2*V_next[k] + V_next[np.maximum(k-1, 0)])/dv2
            H = -(mu*V_next[k] + rho*xi*mV[k]*dphi_v)**2/(2*mV[k]*V_next[k])
            V[k] = V_next[k] - beta*(mV[k] - s2)*dphi_v*dt + 0.5*xi2*mV[k]*dphi_vv*dt + H*dt
            alpha[j, k] = (mu*V[k] + rho*xi*mV[k]*dphi_v)/(mV[k]*eta*V[k])
        V_inter = V #Echange des références
        V = V_next
        V_next = V_inter
    gui.setValue('this', 'oc_progress', 100)
    gui.hide('this', 'waiting')
    rpgm.notification('info', 'Calcul contrôle optimal terminé 💡<br>Résultats ci-dessous (descendre 👇)')
    gui.enable('this', 'oc_calcul')
    gui.setValue('this', 'oc_calcul', 'Calculer 👇')
    return alpha
