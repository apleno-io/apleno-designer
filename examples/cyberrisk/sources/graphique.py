def graph_traj(j=0):
    t = np.linspace(0., T, nt+1)

    fig, axes = plot.subplots(2, 2)
    # Premier sous-graphique
    axes[0, 0].plot(t, X[j, :])
    axes[0, 0].set_title('X')

    # Deuxième sous-graphique
    axes[0, 1].plot(t[:-1], A[j, :])
    axes[0, 1].set_title('Alpha')

    # Troisième sous-graphique
    axes[1, 0].plot(t, Lambda[j, :])
    axes[1, 0].plot(t, Lambda[j, :]/(1+np.concatenate([gamma*A[j, :], np.zeros(1)])))
    axes[1, 0].set_title('Lambda')

    # Quatrième sous-graphique
    axes[1, 1].plot(t, np.exp(-eta*X[j, :])*V[:, ((Lambda[j, :] - mu)/dlambda).astype(int)].diagonal())
    axes[1, 1].set_title('Valeur')

    # Ajuster la disposition des sous-graphiques
    plot.tight_layout()

    # Afficher les graphiques
    plot.show()


def graph_alpha(i_t, i_lambda_max):
    plot.plot(E_Lambda[:i_lambda_max], Alpha[i_t, :i_lambda_max])
    plot.title('Contrôle Optimal')
    plot.xlabel(r'$\Lambda$')
    plot.ylabel(r'$\alpha$')
    plot.savefig('controle.png')
    plot.close()
    gui.update("this", "graph_alpha")
    gui.show(rpgm.step("main", "main"), "graph_alpha")



def graph_density():
    x = np.linspace(np.min(X_0[:, nt]), np.max(X_0[:, nt]), 201)
    plot.plot(x, density(X[:, nt])(x), label = r"$X_T^{a^{\star}}$ optimal")
    plot.plot(x, density(X_0[:, nt])(x), label = r"$X_T$ sans controle")
    plot.title(r'Densit\'{e} de r\'{e}partition de $X_T$')
    plot.xlabel(r'$x$')
    plot.legend()
    plot.savefig('density.png')
    plot.close()
    gui.update("this", "density")
    gui.show("this", "density")


def graph_eta(A_eta, i_lambda_max):
    for i in range(np.size(Eta)):
        plot.plot(E_Lambda[:i_lambda_max], A_eta[i, :i_lambda_max], label="eta = " + str(np.round(Eta[i], 2)))
    plot.legend()
    plot.savefig('analyse.png')
    plot.close()
    gui.update("this", "analyse")
    gui.show("this", "analyse")
