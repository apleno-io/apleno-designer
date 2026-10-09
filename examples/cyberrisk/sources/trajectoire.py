def SimTrajectoires(n, X, Lambda, A):
    Lambda[:, 0] = mu
    for i in range(nt):
        if int(i+1) % int(nt/50) == 0:
            gui.setValue("this", "trajProgress", int((i+1)/nt*50))
        jl = np.minimum(((Lambda[:, i] - mu)/dlambda).astype(int), nl)
        A[:, i] = Alpha[i, jl]
        N = np.random.poisson(dt*Lambda[:, i]/(1+gamma*A[:, i]))
        Y = np.zeros([n, np.max(N)])
        Y[np.tile(np.arange(Y.shape[1]), (Y.shape[0], 1)) < np.tile(N, (np.max(N), 1)).T] = np.random.choice(pd_PY['valeurs'], size=np.sum(N), p=pd_PY['proba'])
        X[:, i+1] = X[:, i] + (c-A[:, i])*dt + sigma*np.sqrt(dt)*np.random.randn(n) - np.sum(Y, axis = 1)
        Lambda[:, i+1] = mu + (Lambda[:, i] - mu)*np.exp(-beta*dt) + delta*N
    return X, Lambda, A


def SimTrajectoires_0(n, X, Lambda):
    Lambda[:, 0] = mu
    for i in range(nt):
        if int(i+1) % int(nt/50) == 0:
            gui.setValue("this", "trajProgress", int(50 + (i+1)/nt*50))
        N = np.random.poisson(dt*Lambda[:, i])
        Y = np.zeros([n, np.max(N)])
        Y[np.tile(np.arange(Y.shape[1]), (Y.shape[0], 1)) < np.tile(N, (np.max(N), 1)).T] = np.random.choice(pd_PY['valeurs'], size=np.sum(N), p=pd_PY['proba'])
        X[:, i+1] = X[:, i] + c*dt + sigma*np.sqrt(dt)*np.random.randn(n) - np.sum(Y, axis = 1)
        Lambda[:, i+1] = mu + (Lambda[:, i] - mu)*np.exp(-beta*dt) + delta*N
    return X, Lambda


# Renvoie la
def density(x):
    def d(y):
        return [np.mean(stats.norm.pdf(y[i] - x, 0, 1.06*np.std(x)/np.size(x)**(1/5))) for i in range(np.size(y))]
    return d


def moments(x, y = None):
    if y is None:
        return {
            'mean': np.mean(x),
            'std': np.std(x),
            'q95%': np.quantile(x, 0.05),
            'q99.5%': np.quantile(x, 0.005),
        }
    else:
        return {
            'mean': np.round(np.array([np.mean(x), np.mean(y)]), 3),
            'std': np.round(np.array([np.std(x), np.std(y)]), 3),
            'q95%': np.round(np.array([np.quantile(x, 0.05), np.quantile(y, 0.05)]), 3),
            'q99.5%': np.round(np.array([np.quantile(x, 0.005), np.quantile(y, 0.005)]), 3),
        }

