import numpy as np
import pandas as pd

gui.hide(rpgm.step("main", "main"), "graph_alpha")
gui.hide(rpgm.step("main", "main"), "density")
gui.hide(rpgm.step("main", "main"), "traj_list")
gui.hide(rpgm.step("main", "main"), "analyse")

def nt_helptext(dt):
    if dt is not None:
        gui.setProperty("this", "nt", "helptext", "Nombre de pas de temps, dt = " + str(dt))
        rpgm.sendToJavascript("refreshMathjax")

def beta_helptext(beta):
    if beta is not None:
        gui.setProperty("this", "beta", "helptext", "Taux de décroissance de l'intensité vers le plancher, 1 unité de temps = -" + str(round((1-np.exp(-beta))*100., 1)) + "%")
        rpgm.sendToJavascript("refreshMathjax")

def nl_helptext(dlambda):
    if dlambda is not None:
        gui.setProperty("this", "nl", "helptext", "Nombre de pas d'espace, \(d\lambda\) = " + str(dlambda))
        rpgm.sendToJavascript("refreshMathjax")


# Valeurs initiales de l'interface
PY = pd.DataFrame(
    {'proba': np.array([0.4, 0.3, 0.2, 0.1]), 'valeurs': np.array([1, 2, 3, 4])}
)

mu = 0.25
l_min = mu
dt = None

dlambda = None
E_Lambda = None
j_delta = None

pd_PY = None

