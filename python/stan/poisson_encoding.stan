data {
  int<lower=1> N;
  int<lower=1> K;
  matrix[N, K] X;
  array[N] int<lower=0> y;
}

parameters {
  real alpha;
  vector[K] beta;
}

model {
  alpha ~ normal(-1, 1.5);
  beta ~ normal(0, 1);
  y ~ poisson_log(alpha + X * beta);
}
