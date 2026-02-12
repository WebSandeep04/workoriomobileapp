import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Dimensions, Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const WishItem = ({ name, type, image, dob, onPress }) => {
    // Robust date parsing
    let formattedDob = '';
    if (dob) {
        try {
            const date = new Date(dob);
            if (!isNaN(date.getTime())) {
                formattedDob = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            }
        } catch (e) {
            // Error parsing date
        }
    }

    return (
        <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
            <View style={styles.avatarContainer}>
                {image ? (
                    <Image
                        source={{ uri: image }}
                        style={styles.avatar}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.iconAvatar}>
                        <Ionicons name="person" size={24} color="#434AFA" />
                    </View>
                )}
            </View>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{type}</Text>
            </View>
            <Text style={styles.name}>{name}</Text>
            {!!formattedDob && <Text style={styles.dobText}>{formattedDob}</Text>}
        </TouchableOpacity>
    );
};

const SeeMoreItem = ({ count, onPress }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
        <View style={[styles.avatarContainer, styles.seeMoreAvatar]}>
            <Text style={styles.seeMoreCount}>{count}+</Text>
            <Text style={styles.seeMoreLabel}>More</Text>
        </View>
        <View style={[styles.badge, { opacity: 0 }]}>
            <Text style={styles.badgeText}>HIDDEN</Text>
        </View>
        <Text style={styles.name}>See More</Text>
    </TouchableOpacity>
);

const WishThem = ({ title = "Wish Them :", wishes = [], onSeeMore }) => {
    const [selectedImage, setSelectedImage] = useState(null);

    if (!wishes || wishes.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>{title}</Text>
                <Text style={{ color: '#aaa', fontStyle: 'italic' }}>No active birthdays found.</Text>
            </View>
        );
    }
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
            >
                {wishes.map((item, index) => (
                    <WishItem
                        key={item.id || index}
                        name={item.name}
                        type={item.type || "B'DAY"}
                        image={item.image}
                        dob={item.dob}
                        onPress={() => {
                            if (item.image) {
                                setSelectedImage(item.image);
                            } else if (item.onPress) {
                                item.onPress();
                            }
                        }}
                    />
                ))}

                {/* {onSeeMore && wishes.length > 5 && (
                    <SeeMoreItem count={2} onPress={onSeeMore} />
                )} */}
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
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
    },
    listContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    itemContainer: {
        alignItems: 'center',
        marginRight: 16,
        width: 70, // Fixed width for alignment
    },
    avatarContainer: {
        marginBottom: -10, // Allow badge to overlap
        zIndex: 1,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    iconAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    placeholderAvatar: {
        backgroundColor: '#E5E7EB', // Gray placeholder
    },
    seeMoreAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1
    },
    seeMoreCount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
    },
    seeMoreLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#000',
    },
    badge: {
        backgroundColor: '#D946EF', // Magenta/Purple
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        zIndex: 2,
        marginBottom: 4,
        minWidth: 40,
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    name: {
        fontSize: 11,
        color: '#1F2937',
        textAlign: 'center',
        fontWeight: '500',
    },
    dobText: {
        fontSize: 10,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
        width: width * 0.95,
        height: width * 0.95,
        borderRadius: 8,
    },
});

export default WishThem;
