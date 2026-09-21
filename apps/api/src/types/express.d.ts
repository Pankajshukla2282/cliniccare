declare module 'express' {
  export type Request = import('express').Request;
  export type Response = import('express').Response;
  export type NextFunction = import('express').NextFunction;
}