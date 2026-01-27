import React from 'react';
import { View, Text, StyleSheet, DimensionValue } from 'react-native';

interface ProgressBarProps {
    progress: number; // 0 to 1
    label?: string;   // Optional text alongside bar
    color?: string;   // Bar color
    width?: DimensionValue;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    label,
    color = '#1C5D74', // Default teal brand color
    width = '100%'
}) => {
    // Clamp progress between 0 and 1
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const percentage = Math.round(clampedProgress * 100);

    return (
        <View style={[styles.container, { width }]}>
            {label && (
                <View style={styles.labelContainer}>
                    <Text style={styles.labelText}>{label}</Text>
                    <Text style={styles.percentageText}>{percentage}%</Text>
                </View>
            )}
            <View style={styles.track}>
                <View
                    style={[
                        styles.fill,
                        {
                            width: `${percentage}%`,
                            backgroundColor: color
                        }
                    ]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
    },
    labelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    labelText: {
        fontFamily: 'Jua',
        fontSize: 18,
        color: '#000000',
        fontWeight: '600',
    },
    percentageText: {
        fontFamily: 'Jua',
        fontSize: 18,
        color: '#000000',
        fontWeight: '500',
    },
    track: {
        height: 8,
        backgroundColor: '#E5E7EB', // Light gray track
        borderRadius: 4,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 4,
    },
});
