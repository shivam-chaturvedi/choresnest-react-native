import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "./ui/AppIcon";
import * as Sentry from "@sentry/react-native";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        Sentry.addBreadcrumb({
            category: "error-boundary",
            message: "React component crash",
            level: "error",
        });
        Sentry.captureException(error, {
            extra: {
                componentStack: errorInfo.componentStack,
            },
        });
        this.setState({ errorInfo });
    }

    resetError = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={styles.safeArea}>
                    <StatusBar barStyle="dark-content" />
                    <View style={styles.container}>
                        <View style={styles.content}>
                            <View style={styles.iconContainer}>
                                <AppIcon name="alert" size={48} color="#DC2626" />
                            </View>

                            <Text style={styles.title}>Oops! Something went wrong</Text>
                            <Text style={styles.subtitle}>
                                We've encountered an unexpected error. Don't worry, your data is safe.
                            </Text>

                            <View style={styles.errorCard}>
                                <ScrollView style={styles.errorScroll}>
                                    <Text style={styles.errorLabel}>Error Details:</Text>
                                    <Text style={styles.errorText}>
                                        {this.state.error && this.state.error.toString()}
                                    </Text>
                                    {this.state.errorInfo && (
                                        <Text style={styles.stackText}>
                                            {this.state.errorInfo.componentStack}
                                        </Text>
                                    )}
                                </ScrollView>
                            </View>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={this.resetError}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.buttonText}>Try to Recover</Text>
                            </TouchableOpacity>

                            <Text style={styles.footerNote}>
                                If the problem persists, please try restarting the app.
                            </Text>
                        </View>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
    },
    content: {
        alignItems: "center",
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#FEE2E2",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1E293B",
        textAlign: "center",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 32,
    },
    errorCard: {
        width: "100%",
        maxHeight: 200,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    errorScroll: {
        flex: 1,
    },
    errorLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#94A3B8",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#DC2626",
        marginBottom: 12,
    },
    stackText: {
        fontSize: 12,
        fontFamily: "Courier",
        color: "#64748B",
        lineHeight: 18,
    },
    primaryButton: {
        width: "100%",
        height: 56,
        backgroundColor: "#DC2626",
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#DC2626",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 4,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
    footerNote: {
        marginTop: 24,
        fontSize: 14,
        color: "#94A3B8",
        textAlign: "center",
    }
});
