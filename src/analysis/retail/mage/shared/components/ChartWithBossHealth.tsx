import React from 'react';
import { SubSection } from 'interface/guide';
import { ChartBuilder } from './ChartBuilder';

/**
 * Simple wrapper that adds boss health fetching to any chart
 */
interface ChartWithBossHealthProps {
  chartBuilder: ChartBuilder;
  reportCode: string;
  title: string;
  explanation?: React.ReactNode;
}

export const ChartWithBossHealth: React.FC<ChartWithBossHealthProps> = ({
  chartBuilder,
  reportCode,
  title,
  explanation,
}) => {
  const [bossHealthData, setBossHealthData] = React.useState<Array<{
    timestamp: number;
    value: number;
  }> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadBossHealth = async () => {
      const data = await chartBuilder.fetchBossHealth(reportCode);
      setBossHealthData(data);
      setLoading(false);
    };
    loadBossHealth();
  }, [chartBuilder, reportCode]);

  if (loading) {
    return (
      <SubSection title={title}>
        <div>Loading chart data...</div>
      </SubSection>
    );
  }

  // Add boss health if available
  let finalBuilder = chartBuilder;
  if (bossHealthData) {
    finalBuilder = chartBuilder.addBossHealth(bossHealthData) as ChartBuilder;
  }

  const chart = finalBuilder.build();

  return (
    <SubSection title={title}>
      {explanation}
      <div style={{ marginTop: '16px' }}>{chart}</div>
    </SubSection>
  );
};
