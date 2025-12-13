/**
 * Middleware de autenticação para endpoints administrativos
 * Requer header X-Admin-Secret com a senha correta
 */
export const adminAuth = (req, res, next) => {
    const adminSecret = req.headers['x-admin-secret'];

    if (!adminSecret) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Admin authentication required. Add header: X-Admin-Secret: your_password'
        });
    }

    if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid admin password'
        });
    }

    // Autenticado com sucesso
    next();
};
