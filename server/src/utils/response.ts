export const success = (ctx: any, data: any = null, message: string = 'success') => {
  ctx.body = { code: 0, message, data };
};

export const error = (ctx: any, code: number, message: string) => {
  ctx.status = code;
  ctx.body = { code, message, data: null };
};

export const paginate = (ctx: any, data: any[], total: number, page: number, pageSize: number) => {
  ctx.body = {
    code: 0,
    message: 'success',
    data: {
      list: data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};
