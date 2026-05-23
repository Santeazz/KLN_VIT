import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiInfo() {
    return {
      name: 'KLN API',
      status: 'ok',
      message:
        'API запущен. Для веб-интерфейса откройте http://localhost:5173 после запуска frontend.',
      endpoints: {
        authLogin: '/api/auth/login',
        employees: '/api/employees',
        templates: '/api/templates',
        observations: '/api/observations',
        bonusReport: '/api/reports/bonus?month=YYYY-MM',
      },
    };
  }
}
