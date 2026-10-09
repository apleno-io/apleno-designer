import numpy as np
import matplotlib.pyplot as plot
import scipy.stats as stats

exec(open("sources/controleoptimal.py").read())
exec(open("sources/trajectoire.py").read())
exec(open("sources/graphique.py").read())

def updateGlobal():
    global l_min, dt, dlambda, E_Lambda, j_delta, pd_PY
    l_min = mu
    dt = T/nt
    dlambda = (l_max - l_min)/nl
    E_Lambda = np.linspace(l_min, l_max, nl+1)
    j_delta = int(delta/dlambda)
    pd_PY = pd.DataFrame(PY, columns = ['proba', 'valeurs'], dtype = float)


def disable_calcul_bouton(idcalcul):
    gui.disable('this', 'oc_calcul')
    gui.disable('this', 'traj_calcul')
    gui.disable('this', 'oc_calcul_eta')
    gui.setValue('this', idcalcul, 'Calcul <i class="fa-solid fa-cog fa-spin"></i>')


def enable_calcul_bouton(idcalcul):
    gui.enable('this', 'oc_calcul')
    gui.enable('this', 'oc_calcul_eta')
    gui.enable('this', 'traj_calcul')
    gui.setValue('this', idcalcul, 'Calculer')
    gui.show('this', 'traj_list')


def disable_oc_calcul():
    gui.disable('this', 'oc_calcul')
    gui.setValue('this', 'oc_calcul', 'Calcul <i class="fa-solid fa-cog fa-spin"></i>')
    gui.disable('this', 'traj_calcul')
    gui.disable('this', 'oc_calcul_eta')


def enable_oc_calcul():
    gui.enable('this', 'oc_calcul')
    gui.setValue('this', 'oc_calcul', 'Calculer')
    gui.enable('this', 'oc_calcul_eta')
    gui.enable('this', 'traj_calcul')
    gui.show('this', 'traj_list')

def OC_Value(eta):
    ePY = np.sum(pd_PY['proba'] * np.exp(eta*pd_PY['valeurs']))
    Alpha, V = np.empty([nt, nl+1]), np.empty([nt+1, nl+1])
    return ControleOptimal(eta, Alpha, V, ePY, "ocProgress")

def BouttonSimTraj():
    X, Lambda, A = np.zeros([n, nt+1]), np.empty([n, nt+1]), np.empty([n, nt])
    X, Lambda, A = SimTrajectoires(n, X, Lambda, A)
    return X, Lambda, A

def BouttonSimTraj_0():
    X_0, Lambda_0 = np.zeros([n, nt+1]), np.empty([n, nt+1])
    X_0, Lambda_0 = SimTrajectoires_0(n, X_0, Lambda_0)
    return X_0, Lambda_0

def updateTableMoments():
    moments(X[:, nt])
    moments(X_0[:, nt])


def enable_traj_calcul():
    gui.enable('this', 'traj_calcul')
    gui.setValue('this', 'traj_calcul', 'Calculer')
    gui.enable('this', 'oc_calcul')
    gui.enable('this', 'oc_calcul_eta')


# eta est un vecteur
Eta = np.linspace(0.01, 0.1, 10)
def OC_Eta(eta):
    gui.setValue("this", "analyseProgress2", 0)
    Alpha, V = np.empty([nt, nl+1]), np.empty([nt+1, nl+1])
    A_eta = np.empty([np.size(eta), nl+1]) # Contrôle en 0
    for i in range(np.size(eta)):
        ePY = np.sum(pd_PY['proba'] * np.exp(eta[i]*pd_PY['valeurs']))
        Alpha_eta, V_eta = ControleOptimal(eta[i], Alpha, V, ePY, "analyseProgress1")
        A_eta[i, :] = Alpha_eta[0, :]
        gui.setValue("this", "analyseProgress2", int((i+1)/np.size(eta)*100))
    return A_eta


