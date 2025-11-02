import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.errors({
      stack: true,
    }),
    winston.format.prettyPrint({
      colorize: true,
    })
  ),
  transports: [
    new winston.transports.Console({
      silent: !['production', 'development'].includes(process.env.NODE_ENV || 'development'),
    }),
  ],
})
