export function h(req: any, res: any) { res.redirect(req.query.next); }
export function k(ctx: any) { ctx.redirect(ctx.query.to); }
