import numpy as np
import matplotlib.pyplot as plot

exec(open("sources/controleoptimal.py").read())
exec(open("sources/trajectoire.py").read())
exec(open("sources/graphique.py").read())


T = 50.
nt = 12500
dt = T/nt

c, sigma = 2., 1

mu, delta, beta = 0.25, 1.5, 2.5

# l représente lambda
l_min, l_max = mu, mu + 20.
nl = 100
dlambda = (l_max - l_min)/nl
E_Lambda = np.linspace(l_min, l_max, nl+1)
j_delta = int(delta/dlambda)

Alpha, V = np.empty([nt, nl+1]), np.empty([nt+1, nl+1])

eta, gamma = 0.05, 0.25

# On n'a besoin que de IE(exp(-eta Y)), pourrait se calculer par avance
PY = {'proba': np.array([0.4, 0.3, 0.2, 0.1]), 'valeurs': np.array([1, 2, 3, 4])}
ePY = np.sum(PY['proba'] * np.exp(eta*PY['valeurs']))


Alpha, V = ControleOptimal(eta, Alpha, V, ePY)

V[0, :]
plot.plot(Alpha[int(25000/2), :])
plot.show()



n = 20000
X, Lambda, A = np.zeros([n, nt+1]), np.empty([n, nt+1]), np.empty([n, nt])
X, Lambda, A = SimTrajectoires(n, X, Lambda, A)

X_0, Lambda_0 = np.zeros([n, nt+1]), np.empty([n, nt+1])
X_0, Lambda_0 = SimTrajectoires_0(n, X_0, Lambda_0)

moments(X[:, nt], X_0[:, nt])

graph_traj(1)

# eta est un vecteur
def OC_Eta(eta):
    A_eta = np.empty([np.size(eta), nl+1]) # Contrôle en 0
    for i in range(np.size(eta)):
        ePY = np.sum(PY['proba'] * np.exp(eta[i]*PY['valeurs']))
        Alpha_eta, V_eta = ControleOptimal(eta[i], Alpha, V, ePY)
        A_eta[i, :] = Alpha_eta[0, :]
    return A_eta

Eta = np.linspace(0.01, 0.1, 10)
A_eta = OC_Eta(Eta)

for i in range(np.size(Eta)):
    plot.plot(E_Lambda, A_eta[i, :], label="eta = " + str(np.round(Eta[i], 2)))

plot.legend()
plot.show()

