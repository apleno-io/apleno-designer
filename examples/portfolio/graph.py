t, alpha = 0, None
plotly_x = 'x_t'
def graph_oc(alpha):
    global plotly_x_value

    if alpha is None:
        return []

    T, minsV, maxsV = 1., 0.01, 0.51
    dt, dv = 0.004, 0.005
    if methode == 'edp':
        dt = 0.0002
    mT, msV = np.arange(0., T+dt, dt), np.arange(minsV, maxsV+dv, dv)
    nt, nv = mT.size-1, msV.size-1

    if plotly_x == 'x_v':
        if plotly_x_value is None:
            plotly_x_value = 0
        data = {
            'x': msV,
            'y': alpha[np.maximum(np.minimum(int(plotly_x_value/dt), nt-1), 0), :],
            'line': {
                'color': 'rgb(41, 128, 185)',
                'width': 3
            }
        }
    else:
        if plotly_x_value is None:
            plotly_x_value = np.sqrt(s2)
        spV = np.clip(plotly_x_value, minsV, maxsV)
        i_pV_float = (spV - minsV)/dv
        p_interpol_sup, i_pv_inf = np.modf(i_pV_float)
        i_pv_inf = i_pv_inf.astype(np.int32)
        i_pv_sup = np.minimum(i_pv_inf + 1, nv)
        data = {'x': mT , 'y': (1. - p_interpol_sup)*alpha[:, i_pv_inf] + p_interpol_sup*alpha[:, i_pv_sup],
                'line': {
                'color': 'rgb(41, 128, 185)',
                'width': 3
            }}

    layout = {
        'xaxis': {'title': {'text': ('√v' if plotly_x == 'x_v' else 's')}},
        'yaxis': {'range': [0, 180]},
        'title': 'Le contrôle optimal'
    }
    return {'data': data, 'layout': layout}

def trajectoires_AVX(alpha):
    n = 10**4
    T, minsV, maxsV = 1., 0.01, 0.51
    dt, dv = 0.004, 0.005
    mT, msV = np.arange(0., T+dt, dt), np.arange(minsV, maxsV+dv, dv)
    nt, nv = mT.size-1, msV.size-1
    sdt = np.sqrt(dt)
    A, V, X = np.empty([2*n, nt]), np.full([2*n, nt+1], s2), np.zeros([2*n, nt+1])

    for j in range(0, nt):
        dW1 = np.random.normal(0., sdt, n)
        dW3 = rho*dW1 + np.sqrt(1.-rho**2)*np.random.normal(0., sdt, n)
        sVj = np.sqrt(V[:, j])
        V[:, j+1] = np.maximum(V[:, j] - beta*(V[:, j] - s2)*dt + xi*sVj*np.concatenate([dW3, -dW3]), 0.)

        i_pV_float = np.minimum(np.maximum((sVj - minsV)/dv, 0.), nv)
        p_interpol_sup, i_pv_inf = np.modf(i_pV_float)
        i_pv_inf = i_pv_inf.astype(np.int32)
        i_pv_sup = np.minimum(i_pv_inf + 1, nv) #l'indice peut atteindre nv+1 sinon, avec un poids de 0, mais génère une erreur
        i_t = (j*dt/0.0002 if methode == 'edp' else j)
        A[:, j] = (1. - p_interpol_sup)*alpha[j, i_pv_inf] + p_interpol_sup*alpha[j, i_pv_sup]
        X[:, j+1] = X[:, j+1] + mu*A[:, j]*dt + A[:, j]*sVj*np.concatenate([dW1, -dW1])
    return A, V, X

def graph_trajectoire(A, V, X):
    T, minsV, maxsV = 1., 0.01, 0.51
    dt, dv = 0.004, 0.005
    mT, msV = np.arange(0., T+dt, dt), np.arange(minsV, maxsV+dv, dv)
    nt, nv = mT.size-1, msV.size-1
    sdt = np.sqrt(dt)

    trace_V = {
        'x': mT,
        'y': np.sqrt(V[0, :])*100,
        'name': '√Vₛ (%)',
        'line': {
                'color': 'rgb(241, 196, 15)',
                'width': 3
            }
        }
    trace_A = {
        'x': mT,
        'y': A[0, :],
        'name': 'αₛ',
        'line': {
                'color': 'rgb(41, 128, 185)',
                'width': 3
            }
        }

    layout = {
        'title': 'Une trajectoire optimale'
    }

    return {'data': [trace_V, trace_A], 'layout': layout}

def graph_PNL(A, V, X):
    T, minsV, maxsV = 1., 0.01, 0.51
    dt, dv = 0.004, 0.005
    mT, msV = np.arange(0., T+dt, dt), np.arange(minsV, maxsV+dv, dv)
    nt, nv = mT.size-1, msV.size-1
    sdt = np.sqrt(dt)

    trace_X = {
        'x': X[:, nt],
        'name': 'X_T',
        'type': 'histogram',
        'marker': {
            'color': 'rgb(39, 174, 96)',
            }
        }

    layout = {
        'title': 'Répartition du P&L',
        'xaxis': {
            'title': {'text': 'X (P&L)'},
            'range': ['-2', '2']}
    }

    return {'data': [trace_X], 'layout': layout}

gui.hide(rpgm.step('main', 'dashboard'), 'tab')
gui.setProperty(rpgm.step('main', 'dashboard'), 'oc_progress', 'progresscolor', '#f1c40f')