parameters {
  vector[2] theta;
}

model {
  theta ~ normal(0, 1);
  target += 0.35 * theta[1] * theta[2];
}
