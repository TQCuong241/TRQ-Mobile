import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import CustomText from '../CustomText';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

const StepIndicator = ({ currentStep, totalSteps, stepLabels }: StepIndicatorProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {stepLabels.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        const isLast = index === totalSteps - 1;

        return (
          <React.Fragment key={index}>
            <View style={styles.stepContainer}>
              <View style={styles.stepContent}>
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor: isCompleted
                        ? colors.primary
                        : isActive
                        ? colors.primary
                        : colors.border,
                    },
                  ]}>
                  {isCompleted ? (
                    <CustomText variant="caption" color="#FFFFFF" weight="bold">
                      ✓
                    </CustomText>
                  ) : (
                    <CustomText
                      variant="caption"
                      color={isActive ? '#FFFFFF' : colors.textSecondary}
                      weight="bold">
                      {stepNumber}
                    </CustomText>
                  )}
                </View>
                <CustomText
                  variant="caption"
                  color={isActive || isCompleted ? colors.primary : colors.textSecondary}
                  weight={isActive ? 'semibold' : 'normal'}
                  style={styles.stepLabel}>
                  {label}
                </CustomText>
              </View>
            </View>
            {!isLast && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor: isCompleted ? colors.primary : colors.border,
                  },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepContent: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  connector: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    marginTop: -24,
  },
});

export default StepIndicator;

