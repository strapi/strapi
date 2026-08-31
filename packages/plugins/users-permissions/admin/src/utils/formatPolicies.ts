const formatPolicies = (policies) =>
  policies.reduce((acc, current) => {
    acc.push({ label: current, value: current });

    return acc;
  }, []);

export default formatPolicies;
