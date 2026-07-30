import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Dimensions, Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const WishItem = ({ name, image, dob, onPress }) => {
    let formattedDob = '';
    if (dob) {
        try {
            const date = new Date(dob);
            if (!isNaN(date.getTime())) {
                formattedDob = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            }
        } catch (e) {}
    }

    return (
        <TouchableOpacity style={styles.itemContainer} onPress={onPress} activeOpacity={0.75}>
            <View style={styles.avatarWrapper}>
                {image ? (
                    <Image
                        source={{ uri: image }}
                        style={styles.avatar}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.iconAvatar}>
                        <Ionicons name="gift-outline" size={20} color="#EC4899" />
                    </View>
                )}
            </View>
            <Text style={styles.name} numberOfLines={1}>{name.trim().split(/\s+/)[0]}</Text>
            {!!formattedDob && <Text style={styles.dobText}>{formattedDob}</Text>}
        </TouchableOpacity>
    );
};

const WishThem = ({ title = "Wish Them :", wishes = [] }) => {
    const [selectedImage, setSelectedImage] = useState(null);

    if (!wishes || wishes.length === 0) {
        return null; // Return null for weightless dashboard state if no birthdays exist
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={styles.listContainer}
            >
                {wishes.map((item, index) => (
                    <WishItem
                        key={item.id || index}
                        name={item.name}
                        image={item.image}
                        dob={item.dob}
                        onPress={() => {
                            if (item.image) {
                                setSelectedImage(item.image);
                            }
                        }}
                    />
                ))}
            </ScrollView>

            <Modal
                visible={!!selectedImage}
                transparent={true}
                onRequestClose={() => setSelectedImage(null)}
                animationType="fade"
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setSelectedImage(null)}
                >
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Ionicons name="close-circle" size={40} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.modalImage}
                            resizeMode="contain"
                        />
                    )}
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        marginTop: -20,
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 12,
        paddingHorizontal: 24,
        letterSpacing: -0.2
    },
    listContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingBottom: 4
    },
    itemContainer: {
        alignItems: 'center',
        marginRight: 18,
        width: 60,
    },
    avatarWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF',
        borderWidth: 1.5,
        borderColor: '#FCE7F3', // Clean soft pink birthday boundary accent
        padding: 2,
        marginBottom: 6,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
    },
    iconAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
        backgroundColor: '#FDF2F8', // Light pink backdrop
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 12,
        color: '#1E293B',
        textAlign: 'center',
        fontWeight: '700',
    },
    dobText: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    modalImage: {
        width: width * 0.9,
        height: width * 0.9,
        borderRadius: 16,
    },
});

export default WishThem;
