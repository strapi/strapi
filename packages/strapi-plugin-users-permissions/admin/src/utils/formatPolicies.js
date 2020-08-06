const formatPolicies = policies =>
  policies.reduce((acc, current) => {
    acc.push({ value: current });

    return acc;
  }, []);

export default formatPolicies;
